import { useEffect, useState } from "react";
import { SketchPicker } from "react-color";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  where,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { Stage, Layer, Line } from "react-konva";
import { getDocs } from "firebase/firestore";
type LineType = {
  tool: string;
  points: number[];
  color: string;
  width: number;
};

const firebaseConfig = {
  apiKey: "AIzaSyCqsh_fLkFOZsF3ifwasOonQUwnEGONMJU",
  authDomain: "sketch-by-kush.firebaseapp.com",
  projectId: "sketch-by-kush",
  storageBucket: "sketch-by-kush.firebasestorage.app",
  messagingSenderId: "472234015041",
  appId: "1:472234015041:web:6f7c735f349ca5188bc9c0",
  measurementId: "G-8T4HDCDX2Q",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const App = () => {
  const [page, setPage] = useState<"main" | "create" | "join" | "draw">("main");
  const [roomCode, setRoomCode] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState("");
  const [roomId, setRoomId] = useState("");
  const [lines, setLines] = useState<LineType[]>([]);
  const [tool, setTool] = useState<string>("brush");
  const [brushColor, setbrushColor] = useState<string>("#000");
  const [brushWidth, setbrushWidth] = useState<number>(5.0);

  const isDrawing = useState(false);

  const listenToRoom = (id: string) => {
    const roomRef = doc(db, "rooms", id);
    return onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (data && data.lines) setLines(data.lines);
    });
  };

  const handleCreateRoom = async () => {
    const code = generateRoomCode();
    const docRef = await addDoc(collection(db, "rooms"), {
      code,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 3 * 60 * 60 * 1000)),
      lines: [],
    });
    setRoomCode(code);
    setRoomId(docRef.id);
    setPage("draw");
    listenToRoom(docRef.id);
  };
  useEffect(() => {
    const cleanUpRooms = async () => {
      const now = Timestamp.now();
      const q = query(collection(db, "rooms"), where("expiresAt", "<", now));
      const snap = await getDocs(q);
      snap.forEach((doc) => {
        deleteDoc(doc.ref);
      });
    };
    cleanUpRooms();
  }, []);

  const handleJoinRoom = async () => {
    const q = query(collection(db, "rooms"), where("code", "==", inputCode));

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      setRoomCode(docSnap.data().code);
      setRoomId(docSnap.id);
      setPage("draw");
      listenToRoom(docSnap.id);
    } else {
      alert("Room not found!");
    }
  };

  const updateRoomLines = async (newLines: LineType[]) => {
    if (!roomId) return;
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, { lines: newLines });
  };

  const handleMouseDown = (e: any) => {
    isDrawing[1](true);
    const pos = e.target.getStage().getPointerPosition();
    setColorPickerOpen(false);
    const newLines = [
      ...lines,
      { tool, points: [pos.x, pos.y], color: brushColor, width: brushWidth },
    ];
    setLines(newLines);
    updateRoomLines(newLines);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing[0]) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setColorPickerOpen(false);
    let lastLine = lines[lines.length - 1];
    lastLine = {
      ...lastLine,
      points: lastLine.points.concat([point.x, point.y]),
    };
    const newLines = lines.slice(0, lines.length - 1).concat(lastLine);
    setLines(newLines);
    updateRoomLines(newLines);
  };

  const handleMouseUp = () => {
    isDrawing[1](false);
  };

  if (page === "main") {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-7xl mb-8">Sketch App</h1>
        <button
          className="mb-4 px-6 py-2 bg-blue-500 text-white rounded"
          onClick={() => setPage("create")}
        >
          Create Room
        </button>
        <button
          className="px-6 py-2 bg-green-500 text-white rounded"
          onClick={() => setPage("join")}
        >
          Join Room
        </button>
      </div>
    );
  }

  if (page === "create") {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl mb-4">Create a Room</h2>
        <button
          className="px-6 py-2 bg-blue-500 text-white rounded"
          onClick={handleCreateRoom}
        >
          Generate Room
        </button>
      </div>
    );
  }

  if (page === "join") {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-xl mb-4">Join a Room</h2>
        <input
          className="mb-4 px-4 py-2 border rounded"
          placeholder="Enter Room Code"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
        />
        <button
          className="px-6 py-2 bg-green-500 text-white rounded"
          onClick={handleJoinRoom}
        >
          Join
        </button>
      </div>
    );
  }

  if (page === "draw") {
    return (
      <div className="w-full h-screen flex flex-col">
        <div className="p-4 bg-gray-100 flex items-center justify-between z-20">
          <span>
            Room Code: <b>{roomCode}</b>
          </span>
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="mx-2"
          >
            <option value="brush">Brush</option>
            <option value="eraser">Eraser</option>
          </select>
          <div
            className="p-2 aspect-square w-[30px] h-[30px] z-20"
            style={{ background: brushColor }}
            onClick={() => {
              setColorPickerOpen(!colorPickerOpen);
            }}
          ></div>
          {colorPickerOpen && (
            <div className="fixed top-[40px] left-1/2 -translate-x-1/2">
              <SketchPicker
                color={brushColor}
                onChange={(color: any) => {
                  if (color && color.hex) {
                    setbrushColor(color.hex);
                  }
                }}
              />
            </div>
          )}
          <input
            type="range"
            min={1}
            max={200}
            value={brushWidth}
            onChange={(e) => setbrushWidth(Number(e.target.value))}
            className="mx-2"
          />
          <span>{brushWidth}</span>
        </div>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight - 60}
          className="flex-1 z-10"
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.width}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>
    );
  }

  return null;
};

export default App;
