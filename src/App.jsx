import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import Upload, { Creat, Url, Warn } from "./assets/Icons";
import { PiWarningCircleLight } from "react-icons/pi";
import { FiDownload, FiTrash2 } from "react-icons/fi";
import { IoCopyOutline, IoCheckmarkOutline } from "react-icons/io5";

function App() {
  const navigate = useNavigate();
  const lifetimeOptions = [
    { value: "", label: "No Limit" },
    { value: "5m", label: "5 Minute" },
    { value: "30m", label: "30 Minute" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hour" },
    { value: "12h", label: "12 Hour" },
    { value: "1d", label: "1 Day" },
    { value: "3d", label: "3 Day" },
    { value: "7d", label: "7 Day" },
  ];
  const [lifetime, setLifetime] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [isUnlimitedViews, setIsUnlimitedViews] = useState(true);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ipRestrictions, setIpRestrictions] = useState("");
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(false);
  const [secretUrl, setSecretUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLifetimeOpen, setIsLifetimeOpen] = useState(false);
  const lifetimeRef = useRef(null);
  const [isViewsOpen, setIsViewsOpen] = useState(false);
  const viewsRef = useRef(null);

  const viewOptions = [
    { value: "unlimited", label: "∞" },
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 25, label: "25" },
    { value: 100, label: "100" },
  ];

  const selectedLifetimeLabel =
    lifetimeOptions.find((o) => o.value === lifetime)?.label || "No Limit";

  useEffect(() => {
    const onClickOutside = (e) => {
      if (lifetimeRef.current && !lifetimeRef.current.contains(e.target)) {
        setIsLifetimeOpen(false);
      }
      if (viewsRef.current && !viewsRef.current.contains(e.target)) {
        setIsViewsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const clampViews = (value) => {
    const numeric = Number.isNaN(Number(value)) ? 1 : parseInt(value, 10);
    return Math.max(1, numeric);
  };

  const handleMaxViewsChange = (e) => {
    setIsUnlimitedViews(false);
    setMaxViews(e.target.value);
  };

  const incrementViews = () => {
    setMaxViews((prev) => String(clampViews(prev) + 1));
  };

  const decrementViews = () => {
    setMaxViews((prev) => String(Math.max(1, clampViews(prev) - 1)));
  };

  const toggleUnlimitedViews = () => {
    setIsUnlimitedViews((prev) => {
      const next = !prev;
      if (next) {
        setMaxViews("");
      } else {
        setMaxViews((val) => String(clampViews(val || 1)));
      }
      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};
    if (!message.trim()) nextErrors.message = "Message is required";
    if (!isUnlimitedViews) {
      if (!maxViews || clampViews(maxViews) < 1)
        nextErrors.maxViews = "Enter at least 1 view";
    }
    if (password && password !== confirmPassword)
      nextErrors.confirmPassword = "Passwords do not match";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createSecret = () => {
    if (!validate()) return;
    const id = Math.random().toString(36).slice(2, 7);
    const url = `https://www.gtransfer.io/${id}`;
    setSecretUrl(url);
    setCreated(true);

    // Navigate to created page with navigation state (no local storage)
    navigate(`/created`, { state: { id, secretUrl: url } });
  };

  const copyUrl = async () => {
    if (!secretUrl) return;
    try {
      await navigator.clipboard.writeText(secretUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (e) {
      // no-op fallback
    }
  };

  const resetForm = () => {
    setMessage("");
    setLifetime("");
    setMaxViews("");
    setIsUnlimitedViews(true);
    setPassword("");
    setConfirmPassword("");
    setIpRestrictions("");
    setErrors({});
    setCreated(false);
    setSecretUrl("");
    setFiles([]);
  };

  const handleFileList = (fileList) => {
    const incoming = Array.from(fileList || []).map((f) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${f.name}`,
      file: f,
      name: f.name,
      size: f.size,
      status: "ready",
    }));
    setFiles((prev) => [...prev, ...incoming]);
  };

  const onFileInputChange = (e) => {
    handleFileList(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFileList(e.dataTransfer.files);
    }
  };

  const preventDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 pt-10 pb-16">
      {/* Logo + Title */}
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Logo" className="mx-auto w-auto h-16 mb-2" />
        <p className="text-gray-300  mx-auto font-[400] text-[20px] md:text-[28px]">
          Send notes and files anonymously with self-
          <br className="hidden sm:block" />
          destruct system
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-[#0e0e0e] border border-zinc-800 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white">New Message</label>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Warn />
              <span className="flex items-center  gap-1">
                <span className="text-white md:block hidden">Tip: </span>
                <span className="md:block hidden">
                  If you want to achieve top security use{" "}
                </span>
                <span className="text-yellow-400 cursor-pointer underline">
                  {" "}
                  neuro RSA
                </span>
              </span>
            </div>
          </div>
          <textarea
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full h-28 rounded-md bg-black/80 border text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand ${
              errors.message ? "border-red-500" : "border-zinc-800"
            }`}
          />
          {errors.message && (
            <p className="text-xs text-red-500 mt-1">{errors.message}</p>
          )}
        </div>
        {/* File Upload */}
        <div>
          <label className="text-white block mb-2">Upload a File</label>
          {files.length === 0 ? (
            <label
              onDrop={onDrop}
              onDragOver={preventDefault}
              onDragEnter={preventDefault}
              className="w-full h-28 border-2 border-dashed border-zinc-700 flex gap-2 items-center justify-center text-gray-400 rounded-md cursor-pointer hover:border-brand transition"
            >
              <input
                type="file"
                multiple
                onChange={onFileInputChange}
                className="hidden"
              />
              <Upload />
              <p className="text-sm">
                Drag and drop file here or{" "}
                <span className="text-brand cursor-pointer underline">
                  Choose file
                </span>
              </p>
            </label>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label
                onDrop={onDrop}
                onDragOver={preventDefault}
                onDragEnter={preventDefault}
                className="min-h-48 h-48 md:h-full border-2 border-dashed border-zinc-700 flex flex-col gap-2 items-center justify-center text-gray-400 rounded-md cursor-pointer hover:border-brand transition"
              >
                <input
                  type="file"
                  multiple
                  onChange={onFileInputChange}
                  className="hidden"
                />
                <Upload />
                <p className="text-sm text-center px-4">
                  Upload Picture or{" "}
                  <span className="text-brand underline">browse</span>
                </p>
              </label>

              <div className="md:col-span-2 h-[220px] overflow-auto custom-scrollbar grid grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-md border ${
                      f.status === "error"
                        ? "border-red-500"
                        : "border-zinc-800"
                    } bg-black/80 px-4 py-3 text-gray-200 relative`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(f.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="cursor-pointer"
                        title="Remove"
                      >
                        <FiTrash2 className="text-red-800" />
                      </button>
                    </div>
                    {f.status === "error" && (
                      <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <PiWarningCircleLight className="inline" /> Failed, try
                        again
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Lifetime + Max Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lifetime */}
          <div>
            <label className="text-white block mb-2">Lifetime</label>
            <div className="relative" ref={lifetimeRef}>
              <button
                type="button"
                onClick={() => setIsLifetimeOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 rounded-md bg-black/80 border p-3 focus:outline-none focus:ring-2 focus:ring-brand text-gray-200 ${
                  errors.lifetime ? "border-red-500" : "border-zinc-800"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isLifetimeOpen}
              >
                <span className="truncate">{selectedLifetimeLabel}</span>
                <svg
                  className="h-4 w-4 text-gray-200"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isLifetimeOpen && (
                <div
                  role="listbox"
                  className="absolute z-20 bottom-full mb-2 w-full rounded-2xl bg-[#171717] border border-zinc-800 shadow-xl overflow-hidden"
                >
                  {lifetimeOptions.map((opt, idx) => {
                    const isSelected = opt.value === lifetime;
                    return (
                      <button
                        type="button"
                        key={opt.value + idx}
                        onClick={() => {
                          setLifetime(opt.value);
                          setIsLifetimeOpen(false);
                        }}
                        className={`${
                          isSelected
                            ? "bg-brand text-white"
                            : "bg-transparent text-gray-200 hover:bg-zinc-800"
                        } w-full text-left px-4 py-3`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Max Views */}
          <div>
            <label className="text-white block mb-2">Max Views</label>
            <div className="relative mb-2" ref={viewsRef}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={isUnlimitedViews ? "" : maxViews}
                onChange={handleMaxViewsChange}
                disabled={isUnlimitedViews}
                placeholder={isUnlimitedViews ? "∞" : "Enter views"}
                className={`w-full rounded-md bg-black/80 border text-gray-200 p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  errors.maxViews ? "border-red-500" : "border-zinc-800"
                } ${isUnlimitedViews ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              <button
                type="button"
                onClick={() => setIsViewsOpen((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-200"
                aria-haspopup="listbox"
                aria-expanded={isViewsOpen}
                aria-label="Choose preset"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isViewsOpen && (
                <div
                  role="listbox"
                  className="absolute z-20 bottom-full mb-2 w-full rounded-2xl bg-[#171717] border border-zinc-800 shadow-xl overflow-hidden"
                >
                  {viewOptions.map((opt, idx) => {
                    const isSelected =
                      (opt.value === "unlimited" && isUnlimitedViews) ||
                      (!isUnlimitedViews &&
                        String(opt.value) === String(maxViews));
                    return (
                      <button
                        type="button"
                        key={String(opt.value) + idx}
                        onClick={() => {
                          if (opt.value === "unlimited") {
                            setIsUnlimitedViews(true);
                            setMaxViews("");
                          } else {
                            setIsUnlimitedViews(false);
                            setMaxViews(String(opt.value));
                          }
                          setIsViewsOpen(false);
                        }}
                        className={`${
                          isSelected
                            ? "bg-brand text-white"
                            : "bg-transparent text-gray-200 hover:bg-zinc-800"
                        } w-full text-left px-4 py-3`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Password + Confirm */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white mb-2">
              <span> Password </span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-black/80 border border-zinc-800 text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-white mb-2">
              <span> Confirm Password </span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full rounded-md bg-black/80 border text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand ${
                errors.confirmPassword ? "border-red-500" : "border-zinc-800"
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-white flex mb-2 justify-between items-center">
              <span> IP restrictions</span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <input
              type="text"
              placeholder="Enter allowed IPs"
              value={ipRestrictions}
              onChange={(e) => setIpRestrictions(e.target.value)}
              className="w-full rounded-md bg-black/80 border border-zinc-800 text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <button
              onClick={createSecret}
              className="w-full bg-brand hover:bg-brand-dark text-white font-semibold px-8 py-2.5 cursor-pointer rounded-md transition"
            >
              Create a Secret Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
