"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ListCollapse, Volume2, Send, Keyboard } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { useAuth } from "@/lib/auth-context";
import { executeVoiceCommand } from "@/app/actions/voice";
import {
  Button,
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Input,
  toast,
} from "./ui/index";

interface CommandHistoryItem {
  id: string;
  command: string;
  action: string;
  result: string;
  success: boolean;
  timestamp: Date;
}

type InputMode = "vapi" | "speech" | "text";

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";

export const VoiceAgent = () => {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("text"); // default safe
  const [textCommand, setTextCommand] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  const vapiRef = useRef<Vapi | null>(null);
  const recognitionRef = useRef<any>(null);

  // Detect best available input mode on mount
  useEffect(() => {
    const isVapiConfigured = !!VAPI_PUBLIC_KEY && !!VAPI_ASSISTANT_ID;

    if (isVapiConfigured) {
      try {
        vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current.on("call-start", () => setIsListening(true));
        vapiRef.current.on("call-end", () => setIsListening(false));
        vapiRef.current.on("message", async (message: any) => {
          if (message.type === "transcript" && message.transcriptType === "final") {
            const rawText = message.transcript;
            setTranscript(rawText);
            if (user) await handleProcessCommand(rawText);
          }
        });
        vapiRef.current.on("error", () => trySetupSpeech());
        setInputMode("vapi");
        return;
      } catch {
        // fall through
      }
    }

    trySetupSpeech();

    return () => {
      vapiRef.current?.stop();
      recognitionRef.current?.abort();
    };
  }, [user]);

  const trySetupSpeech = () => {
    // SpeechRecognition only works over HTTPS or localhost
    const SpeechRecognitionAPI =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognitionAPI) {
      try {
        const rec = new SpeechRecognitionAPI();
        rec.lang = "fr-FR";
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          if (user) await handleProcessCommand(text);
        };
        rec.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            toast.error("Accès au microphone refusé. Utilisez la saisie texte.");
            setInputMode("text");
          }
        };

        recognitionRef.current = rec;
        setInputMode("speech");
      } catch {
        setInputMode("text");
      }
    } else {
      // Text fallback — works in all browsers
      setInputMode("text");
    }
  };

  const handleProcessCommand = async (text: string) => {
    if (!user || !text.trim()) return;
    setIsProcessing(true);
    setTranscript(text);

    try {
      const res = await executeVoiceCommand(user.uid, text.trim());

      const newItem: CommandHistoryItem = {
        id: Math.random().toString(36).substring(2),
        command: text,
        action: res.action,
        result: res.result,
        success: res.success,
        timestamp: new Date(),
      };

      setHistory((prev) => [newItem, ...prev]);

      if (res.success) {
        toast.success(res.result);
      } else {
        toast.error(res.result);
      }

      speakResponse(res.speechText);
    } catch {
      toast.error("Erreur lors du traitement de la commande.");
    } finally {
      setIsProcessing(false);
      setTranscript("");
      setTextCommand("");
    }
  };

  const speakResponse = (text: string) => {
    if (inputMode !== "vapi" || !vapiRef.current) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        const voices = window.speechSynthesis.getVoices();
        const frVoice = voices.find((v) => v.lang.startsWith("fr"));
        if (frVoice) utterance.voice = frVoice;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleToggleMic = () => {
    if (inputMode === "vapi" && vapiRef.current) {
      if (isListening) {
        vapiRef.current.stop();
        setIsListening(false);
      } else {
        setTranscript("");
        vapiRef.current.start(VAPI_ASSISTANT_ID);
      }
    } else if (inputMode === "speech" && recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        setTranscript("");
        try {
          recognitionRef.current.start();
        } catch (e: any) {
          // Already started or other error
          if (e?.name === "NotAllowedError") {
            toast.error("Accès microphone refusé. Autorisez-le dans votre navigateur.");
            setInputMode("text");
          }
        }
      }
    } else {
      // text mode — toggle the input field
      setShowTextInput((v) => !v);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textCommand.trim()) return;
    handleProcessCommand(textCommand.trim());
  };

  const isMicMode = inputMode === "vapi" || inputMode === "speech";
  const isTextMode = inputMode === "text";

  return (
    <>
      {/* ── Floating bottom-right UI ── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-3">

        {/* Text command input (shown in text mode or toggled) */}
        {(isTextMode || showTextInput) && (
          <form
            onSubmit={handleTextSubmit}
            className="flex items-center gap-2 bg-slate-950/95 border border-slate-700/60 rounded-2xl px-3 py-2 shadow-2xl backdrop-blur-xl animate-fade-up"
          >
            <Input
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder='Ex: "vendre 3 riz client Jean"'
              className="w-64 h-9 bg-transparent border-0 focus:ring-0 text-xs text-slate-200 placeholder-slate-500"
              disabled={isProcessing}
              autoFocus
            />
            <Button
              type="submit"
              variant="gradient"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={isProcessing || !textCommand.trim()}
            >
              {isProcessing ? (
                <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}

        {/* Transcript / processing bubble */}
        {isListening && (
          <div className="rounded-xl border border-cyan-800/50 bg-slate-950/95 px-4 py-2.5 text-xs text-cyan-400 backdrop-blur-xl shadow-2xl max-w-[280px] text-right animate-fade-up">
            {isProcessing ? (
              <span className="flex items-center gap-1.5 justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-slate-400 ml-1">Traitement...</span>
              </span>
            ) : transcript ? (
              `"${transcript}"`
            ) : (
              "Elena écoute... Parlez maintenant"
            )}
          </div>
        )}

        <div className="flex space-x-2.5">
          {/* History drawer trigger */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSheetOpen(true)}
            className="rounded-full bg-slate-950/80 border-slate-800 hover:bg-slate-900 shadow-lg"
            title="Historique des commandes"
          >
            <ListCollapse className="h-5 w-5 text-slate-400" />
          </Button>

          {/* Main action button */}
          {isMicMode ? (
            /* Mic button */
            <button
              onClick={handleToggleMic}
              disabled={isProcessing}
              title={isListening ? "Arrêter" : "Parler à Elena"}
              className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-950/95 text-slate-100 transition-all duration-300 shadow-xl focus:outline-none hover:scale-105 active:scale-95 disabled:opacity-60 disabled:pointer-events-none border-2 ${
                isListening
                  ? "border-emerald-500 shadow-emerald-500/30"
                  : "border-transparent"
              }`}
              style={
                !isListening
                  ? {
                      backgroundImage:
                        "linear-gradient(#090d16, #090d16), linear-gradient(135deg, #06B6D4, #10B981)",
                      backgroundOrigin: "border-box",
                      backgroundClip: "content-box, border-box",
                    }
                  : undefined
              }
            >
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping pointer-events-none" />
                  <span className="absolute inset-[-8px] rounded-full border border-emerald-500/20 mic-ring pointer-events-none" />
                </>
              )}
              {isListening ? (
                <Mic className="h-6 w-6 text-emerald-400 animate-pulse" />
              ) : (
                <MicOff className="h-6 w-6 text-cyan-400" />
              )}
            </button>
          ) : (
            /* Text / keyboard button */
            <button
              onClick={handleToggleMic}
              title={showTextInput ? "Fermer la saisie" : "Saisir une commande"}
              className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 shadow-xl focus:outline-none hover:scale-105 active:scale-95 border-2 ${
                showTextInput
                  ? "bg-cyan-600 border-cyan-500 shadow-cyan-500/30"
                  : "bg-slate-950/95 border-transparent"
              }`}
              style={
                !showTextInput
                  ? {
                      backgroundImage:
                        "linear-gradient(#090d16, #090d16), linear-gradient(135deg, #06B6D4, #10B981)",
                      backgroundOrigin: "border-box",
                      backgroundClip: "content-box, border-box",
                    }
                  : undefined
              }
            >
              <Keyboard
                className={`h-6 w-6 ${showTextInput ? "text-white" : "text-cyan-400"}`}
              />
            </button>
          )}
        </div>

        {/* Mode indicator label */}
        <div className="text-[10px] text-slate-600 text-right pr-1">
          {inputMode === "vapi"
            ? "Agent vocal ELENA"
            : inputMode === "speech"
            ? "Reconnaissance vocale"
            : "Mode saisie texte"}
        </div>
      </div>

      {/* ── History drawer ── */}
      <Sheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        <SheetHeader>
          <SheetTitle>ELENA — Commandes</SheetTitle>
          <SheetDescription>
            Historique des commandes exécutées.
          </SheetDescription>
        </SheetHeader>

        {/* Commands guide */}
        <div className="p-4 mb-5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-2">
            Commandes supportées :
          </div>
          <div>• <span className="text-cyan-400">ajouter stock riz quantité 10</span></div>
          <div>• <span className="text-cyan-400">vendre 5 riz client Jean</span></div>
          <div>• <span className="text-cyan-400">afficher stock riz</span></div>
          <div>• <span className="text-cyan-400">générer facture montant 150</span></div>
        </div>

        {/* Inline text command input inside sheet too */}
        {!user ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Connectez-vous pour utiliser les commandes.
          </p>
        ) : (
          <form onSubmit={handleTextSubmit} className="flex gap-2 mb-5">
            <Input
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder="Tapez une commande..."
              className="flex-1 text-xs"
              disabled={isProcessing}
            />
            <Button
              type="submit"
              variant="gradient"
              size="icon"
              className="shrink-0"
              disabled={isProcessing || !textCommand.trim()}
            >
              {isProcessing ? (
                <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}

        {/* History list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <Volume2 className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-sm">Aucune commande exécutée.</p>
              <p className="text-xs text-slate-600 mt-1">
                {isMicMode
                  ? "Appuyez sur le micro pour parler."
                  : "Tapez une commande ci-dessus."}
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/50 space-y-2 text-xs animate-fade-up"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.timestamp.toLocaleTimeString("fr-FR")}
                  </span>
                  <Badge variant={item.success ? "success" : "danger"}>
                    {item.action}
                  </Badge>
                </div>
                <div className="text-slate-200 font-medium">
                  &quot;{item.command}&quot;
                </div>
                <div className="text-slate-400 pt-1.5 border-t border-slate-800/40">
                  {item.result}
                </div>
              </div>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
};

export default VoiceAgent;
