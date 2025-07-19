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
import CSSIoButton from "./components/css-io-button";
import { FaPlus } from "react-icons/fa";
import { TbArrowsJoin } from "react-icons/tb";
import { BiCopy } from "react-icons/bi";
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
  Math.random().toString(36).substring(2, 8).toLowerCase();

const App = () => {
  const [page, setPage] = useState<"main" | "draw">("main");
  const [roomCode, setRoomCode] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<"join" | "create">("create");
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
    const q = query(
      collection(db, "rooms"),
      where("code", "==", inputCode.toLowerCase())
    );

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
      <>
        <video
          src="/bg.mp4"
          className="fixed top-0 left-0 w-screen h-screen object-cover z-[-1]"
          autoPlay
          muted
        />
        {modalOpen && (
          <div className="fixed top-0 left-0 w-screen h-screen flex flex-col items-center justify-center bg-[#0005] z-50">
            <div className="bg-white p-4 rounded-xl w-[30vw] h-[20rem] shadow-md z-50">
              {modalContent === "join" && (
                <>
                  <h2 className="text-lg font-bold mb-2 text-center text-[3rem]">
                    Join Room
                  </h2>
                  <label htmlFor="roomCode">Room Code:</label>
                  <input
                    type="text"
                    placeholder="Enter room code"
                    name="roomCode"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="border border-gray-300 p-2 rounded w-full mb-2 outline-none"
                  />
                  <div className="flex items-center justify-center">
                    <CSSIoButton
                      onClick={() => {
                        handleJoinRoom();
                        setModalOpen(false);
                      }}
                    >
                      <TbArrowsJoin />
                      Join Room
                    </CSSIoButton>
                  </div>
                </>
              )}
              {modalContent === "create" && (
                <>
                  <h2 className="text-lg font-bold mb-2 text-center text-[3rem]">
                    Room Created
                  </h2>
                  <p className="text-center my-8">
                    Your room code is:{" "}
                    {roomCode ? (
                      <b className="p-4 bg-gray-200 rounded-xl">
                        {roomCode.toUpperCase()}
                        <button
                          className="bg-transparent border-none outline-none ml-4 text-lg"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(roomCode.toUpperCase())
                              .then(() => {
                                const successSpan =
                                  document.querySelector("#success-copy");
                                if (successSpan) {
                                  successSpan.textContent = "Copied Room Code";
                                  setTimeout(() => {
                                    successSpan.textContent = "";
                                  }, 2000);
                                }
                              })
                              .catch((err) => {
                                console.error("Failed to copy text: ", err);
                              });
                          }}
                        >
                          <BiCopy />
                        </button>
                      </b>
                    ) : (
                      <p>Loading...</p>
                    )}
                  </p>
                  <p
                    className="text-green-500 text-center text-2xl mb-4"
                    id="success-copy"
                  ></p>
                  {roomCode && (
                    <div className="flex items-center justify-center">
                      <CSSIoButton
                        onClick={() => {
                          setPage("draw");
                        }}
                      >
                        <TbArrowsJoin />
                        Join Room
                      </CSSIoButton>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center h-screen backdrop-blur-3xl bg-[#fff4]">
          <h1 className="text-[10rem] font-extrabold">Sketch</h1>
          <em className="text-2xl">Graphics Meet Collaboration</em>
          <div className="flex flex-row gap-4 mt-20">
            <CSSIoButton
              onClick={() => {
                setModalOpen(true);
                setModalContent("join");
              }}
            >
              <TbArrowsJoin /> Join Room
            </CSSIoButton>
            <CSSIoButton
              onClick={() => {
                handleCreateRoom();
                setModalContent("create");
                setModalOpen(true);
              }}
            >
              <FaPlus /> Create Room
            </CSSIoButton>
          </div>
        </div>
      </>
    );
  }

  if (page === "draw") {
    return (
      <div className="w-full h-screen flex flex-col">
        <div className="p-4 bg-white flex items-center w-fit fixed bottom-0 left-1/2 rounded-full -translate-x-1/2 justify-between z-20 transition-all duration-400">
          <span>
            Room Code:{" "}
            <b className="bg-gray-200 p-2 rounded-lg">
              {roomCode.toUpperCase()}
              <button
                className="bg-transparent border-none outline-none ml-4 text-lg"
                onClick={() => {
                  navigator.clipboard
                    .writeText(roomCode.toUpperCase())
                    .catch((err) => {
                      console.error("Failed to copy text: ", err);
                    });
                }}
              >
                <BiCopy />
              </button>
            </b>
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
            <div className="fixed bottom-[70px] left-1/2 -translate-x-1/2">
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
            id="thick-brush"
          />
          <span>{brushWidth}</span>
        </div>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight - 60}
          className="flex-1 z-10 bg-gray-200"
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
