import React, { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent } from "./components/ui/card";
import {
  Home,
  ClipboardList,
  MessageSquare,
  Phone,
  DollarSign,
  Info,
  Send,
  CalendarClock,
  XCircle,
  Camera,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

/* Types */
type Task = {
  id: string;
  text: string;
  date: string;
  image?: string | null;
  completed: boolean;
  installerNote?: string | null;
};

type Message = {
  id: string;
  text?: string;
  image?: string | null;
  sender: "customer" | "support";
  createdAt: string;
};

const LOCAL_TASKS = "el_tasks_v1";
const LOCAL_MESSAGES = "el_messages_v1";

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const useDebouncedSaver = (saveFn: () => void, delay = 300) => {
  const timer = useRef<number | null>(null);
  useEffect(() => {
    timer.current && window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveFn(), delay);
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
};

const resizeFileToDataUrl = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export default function App(): JSX.Element {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [page, setPage] = useState<"dashboard" | "tasks" | "messages" | "contact">("dashboard");
  const isDark = mode === "dark";

  const [tasks, setTasks] = useState<Task[]>(() => readJson<Task[]>(LOCAL_TASKS, []));
  const [messages, setMessages] = useState<Message[]>(() => readJson<Message[]>(LOCAL_MESSAGES, []));

  const [newTask, setNewTask] = useState("");
  const [taskPreviewUrl, setTaskPreviewUrl] = useState<string | null>(null);
  const taskInputRef = useRef<HTMLInputElement | null>(null);

  const [messageText, setMessageText] = useState("");
  const [messagePreviewUrl, setMessagePreviewUrl] = useState<string | null>(null);
  const messageFileRef = useRef<HTMLInputElement | null>(null);

  const [showCompleted, setShowCompleted] = useState(false);
  const [requestedService, setRequestedService] = useState(false);

  useDebouncedSaver(
    () => {
      try {
        localStorage.setItem(LOCAL_TASKS, JSON.stringify(tasks));
      } catch {
        console.warn("Failed to save tasks to localStorage (quota?)");
      }
    },
    500
  );

  useDebouncedSaver(
    () => {
      try {
        localStorage.setItem(LOCAL_MESSAGES, JSON.stringify(messages));
      } catch {
        console.warn("Failed to save messages to localStorage (quota?)");
      }
    },
    500
  );

  useEffect(() => {
    return () => {
      if (taskPreviewUrl) URL.revokeObjectURL(taskPreviewUrl);
      if (messagePreviewUrl) URL.revokeObjectURL(messagePreviewUrl);
    };
  }, [taskPreviewUrl, messagePreviewUrl]);

  const toggleMode = () => setMode(isDark ? "light" : "dark");

  const addTask = async (file?: File | null) => {
    if (!newTask.trim()) return;
    let imageData: string | null = null;
    if (file) {
      try {
        imageData = await resizeFileToDataUrl(file, 1200, 0.8);
      } catch {
        console.warn("Image resize failed");
      }
    }

    const task: Task = {
      id: (crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Date.now().toString()),
      text: newTask.trim(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      image: imageData,
      completed: false,
      installerNote: null,
    };
    setTasks((prev) => [...prev, task]);
    setNewTask("");
    if (taskPreviewUrl) {
      URL.revokeObjectURL(taskPreviewUrl);
      setTaskPreviewUrl(null);
    }
    if (taskInputRef.current) taskInputRef.current.value = "";
  };

  const sendMessage = async (file?: File | null) => {
    if (!messageText.trim() && !file && !messagePreviewUrl) return;
    let imageData: string | null = null;
    if (file) {
      try {
        imageData = await resizeFileToDataUrl(file, 1200, 0.8);
      } catch {
        console.warn("Message image resize failed");
      }
    }
    const message: Message = {
      id: (crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Date.now().toString()),
      text: messageText.trim() || undefined,
      image: imageData,
      sender: "customer",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
    setMessageText("");
    if (messagePreviewUrl) {
      URL.revokeObjectURL(messagePreviewUrl);
      setMessagePreviewUrl(null);
    }
    if (messageFileRef.current) messageFileRef.current.value = "";
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(tasks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setTasks(reordered);
  };

  const handleRequestService = () => {
    const hasOpen = tasks.some((t) => !t.completed);
    if (!hasOpen) {
      alert("Please create a task before requesting service.");
      return;
    }
    setRequestedService((s) => !s);
    alert(requestedService ? "Your service request has been cancelled." : "Your service request has been sent.");
  };

  const addInstallerNote = (taskId: string, note: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, installerNote: note } : t)));
  };

  const handleTaskFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setTaskPreviewUrl(url);
  };

  const handleMessageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setMessagePreviewUrl(url);
  };

  const themeClass = isDark ? "bg-gray-800 text-gray-100" : "bg-white text-black";
  const taskCardClass = isDark ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-200 text-black";
  const buttonStyle = `${isDark ? "border-gray-500 text-gray-100 hover:bg-gray-700" : "border-gray-400 text-black hover:bg-gray-200"}`;

  const renderRightPanel = () => (
    <aside className={`hidden lg:block lg:col-span-1`}>
      <div className={`p-3 rounded sticky top-6 ${isDark ? "bg-gray-900 border border-gray-700" : "bg-white border border-gray-200"}`}>
        <h4 className="font-semibold mb-2 text-sm text-[#1C5DAE]">Recent Messages</h4>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs opacity-70">No messages yet.</p>
          ) : (
            messages
              .slice(-5)
              .reverse()
              .map((m) => (
                <div key={m.id} className="text-xs">
                  <div className="flex items-start gap-2">
                    <div className={`p-2 rounded ${m.sender === "customer" ? "bg-[#1C5DAE] text-white" : "bg-gray-300 text-black"}`}>
                      <span className="block max-w-[10rem] truncate">{m.text ?? "Image"}</span>
                    </div>
                  </div>
                  <div className="opacity-60 text-[11px] mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              ))
          )}
        </div>

        <hr className="my-3" />

        <h4 className="font-semibold mb-2 text-sm text-[#1C5DAE]">Contact</h4>
        <div className="text-sm space-y-2">
          <div>
            <p className="font-medium">Topeka</p>
            <a href="tel:7852325966" className="text-[#1C5DAE] underline">785-232-5966</a>
          </div>
          <div>
            <p className="font-medium">Kansas City</p>
            <a href="tel:9132274122" className="text-[#1C5DAE] underline">913-227-4122</a>
          </div>
          <div>
            <p className="font-medium">Manhattan</p>
            <a href="tel:7855871919" className="text-[#1C5DAE] underline">785-587-1919</a>
          </div>
        </div>
      </div>
    </aside>
  );

  const renderPage = () => {
    if (page === "dashboard") {
      return (
        <Card className={themeClass}>
          <CardContent>
            <h3 className="text-xl lg:text-2xl font-semibold mb-3 flex items-center gap-2 text-[#1C5DAE]">
              <Home className="h-6 w-6" />
              Dashboard
            </h3>
            <p className="text-sm lg:text-base mb-4 opacity-80 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-[#1C5DAE]" />
              Welcome to your Electronic Life customer portal. Track your open service tasks, message our support team, and manage your VIP membership — all in one place.
            </p>
            <div className="border p-4 rounded-lg text-center mb-3">
              <h4 className="text-md lg:text-lg font-semibold mb-1">Free 90-Day Test &amp; Tune</h4>
              <p className="text-sm opacity-80">45 days remaining</p>
              <p className="text-xs opacity-60 mb-3">Upgrade now to continue after your trial</p>
              <Button className="bg-[#1C5DAE] hover:bg-[#164C8E] text-white w-full lg:w-auto">
                <DollarSign className="h-4 w-4 mr-1" />
                Buy VIP Membership
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (page === "messages") {
      return (
        <Card className={themeClass}>
          <CardContent>
            <h3 className="text-lg lg:text-xl font-semibold mb-3 flex items-center gap-2 text-[#1C5DAE]">
              <MessageSquare className="h-5 w-5" />
              Messages
            </h3>

            <div
              className="border rounded-md p-2 mb-3 overflow-y-auto bg-gray-50 dark:bg-gray-900 space-y-2"
              style={{ maxHeight: "min(60vh, 600px)" }}
              aria-live="polite"
              aria-atomic="false"
            >
              {messages.length === 0 ? (
                <p className="text-sm opacity-70">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`p-3 rounded-lg max-w-[75%] ${msg.sender === "customer" ? "bg-[#1C5DAE] text-white" : "bg-gray-300 text-black"}`}>
                      {msg.text && <p className="text-sm lg:text-base whitespace-pre-line">{msg.text}</p>}
                      {msg.image && <img src={msg.image} alt={`Attachment ${msg.id}`} className="rounded mt-2 max-h-48" />}
                      <div className="text-xs opacity-60 mt-2">{new Date(msg.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex items-center gap-2">
                <label htmlFor="msgImgUpload" className="cursor-pointer px-2 py-1 border rounded text-xs hover:opacity-80" aria-hidden="false">
                  Add Photo
                </label>
                <input id="msgImgUpload" ref={messageFileRef} type="file" accept="image/*" className="hidden" onChange={handleMessageFileSelect} aria-label="Attach image to message" />
              </div>

              <Input
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const file = messageFileRef.current?.files?.[0] ?? null;
                    sendMessage(file);
                  }
                }}
                className="flex-1"
              />
              <Button
                className="bg-[#1C5DAE] hover:bg-[#164C8E] text-white"
                onClick={() => {
                  const file = messageFileRef.current?.files?.[0] ?? null;
                  sendMessage(file);
                }}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {messagePreviewUrl && (
              <div className="mt-2">
                <p className="text-xs opacity-70">Preview</p>
                <img src={messagePreviewUrl} alt="Message preview" className="max-h-36 rounded" />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (page === "contact") {
      return (
        <Card className={themeClass}>
          <CardContent>
            <h3 className="text-lg lg:text-xl font-semibold mb-3 flex items-center gap-2 text-[#1C5DAE]">
              <Phone className="h-5 w-5" />
              Contact Us
            </h3>
            <div className="space-y-3 text-sm lg:text-base">
              <div>
                <p className="font-semibold">Topeka</p>
                <a href="tel:7852325966" className="text-[#1C5DAE] underline">785-232-5966</a>
              </div>
              <div>
                <p className="font-semibold">Kansas City</p>
                <a href="tel:9132274122" className="text-[#1C5DAE] underline">913-227-4122</a>
              </div>
              <div>
                <p className="font-semibold">Manhattan</p>
                <a href="tel:7855871919" className="text-[#1C5DAE] underline">785-587-1919</a>
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <a href="mailto:VIP@electroniclife.com" className="text-[#1C5DAE] underline">VIP@electroniclife.com</a>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (page === "tasks") {
      const open = tasks.filter((t) => !t.completed);
      const completed = tasks.filter((t) => t.completed);
      const hasOpenTasks = open.length > 0;

      return (
        <Card className={themeClass}>
          <CardContent>
            <h3 className="text-lg lg:text-xl font-semibold mb-3 flex items-center gap-2 text-[#1C5DAE]">
              <ClipboardList className="h-5 w-5" />
              Task Manager
            </h3>

            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <Input
                placeholder="Describe your task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const file = taskInputRef.current?.files?.[0] ?? null;
                    addTask(file);
                  }
                }}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <label htmlFor="taskImageUpload" className="cursor-pointer p-2 border rounded" aria-label="Attach task image">
                  <Camera className="h-4 w-4" />
                </label>
                <input id="taskImageUpload" ref={taskInputRef} type="file" accept="image/*" className="hidden" onChange={handleTaskFileSelect} />
              </div>
            </div>

            {taskPreviewUrl && (
              <div className="mb-2">
                <p className="text-xs opacity-70">Preview</p>
                <img src={taskPreviewUrl} alt="Task preview" className="max-h-36 rounded" />
              </div>
            )}

            <Button className="bg-[#1C5DAE] hover:bg-[#164C8E] text-white w-full mb-4" onClick={() => addTask(taskInputRef.current?.files?.[0] ?? null)}>
              Add Task
            </Button>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="text-sm space-y-2" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                    {open.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(p) => (
                          <li ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={`border p-3 rounded-md ${taskCardClass}`}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                {task.image && <img src={task.image} alt={`Task ${task.id} thumbnail`} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded object-cover" />}
                                <div>
                                  <p className="font-medium lg:text-lg">{task.text}</p>
                                  <p className="text-xs opacity-70">Created {task.date}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                className="text-green-600"
                                onClick={() => setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true } : t)))}
                                aria-label={`Mark ${task.text} done`}
                              >
                                Mark Done
                              </Button>
                            </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>

            {completed.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setShowCompleted((s) => !s)}>
                  {showCompleted ? "Hide Task History" : "View Task History"}
                </Button>

                {
