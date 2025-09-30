import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";
import Upload, { Warn } from "./assets/Icons";
import { PiWarningCircleLight } from "react-icons/pi";
import { FiTrash2 } from "react-icons/fi";
import {
  uploadFile,
  generateShareUrl,
  calculateExpiration,
  formatBytes,
} from "./services/api";
import { ThreeDots } from "react-loader-spinner";

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
  const [showTooltip, setShowTooltip] = useState(false);
  const [lifetime, setLifetime] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [isUnlimitedViews, setIsUnlimitedViews] = useState(true);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ipRestrictions, setIpRestrictions] = useState("");
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [isLifetimeOpen, setIsLifetimeOpen] = useState(false);
  const lifetimeRef = useRef(null);
  const [isViewsOpen, setIsViewsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const viewsRef = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Set());
  const [uploadProgress, setUploadProgress] = useState({});
  const [successFiles, setSuccessFiles] = useState(new Set());
  const [uploadedUrls, setUploadedUrls] = useState([]);

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

  const validatePasswords = (password, confirmPassword) => {
    let error = {};
    if (
      password &&
      !/^[A-Za-z0-9!@#$%^&*()_+={}:;"'<>?,.]{6,}$/.test(password)
    ) {
      error.password =
        "Password must be at least 6 characters and contain only valid symbols.";
    }
    if (confirmPassword) {
      if (!password) {
        error.confirmPassword = "Password is required before confirming";
      } else if (password !== confirmPassword) {
        error.confirmPassword = "Passwords do not match";
      }
    }

    setErrors((prev) => ({ ...prev, ...error }));
    if (!error.password) {
      setErrors((prev) => {
        const { password, ...rest } = prev;
        return rest;
      });
    }
    if (!error.confirmPassword) {
      setErrors((prev) => {
        const { confirmPassword, ...rest } = prev;
        return rest;
      });
    }
    return error;
  };

  const validate = () => {
    let nextErrors = {};
    if (uploadedUrls.length === 0 && message === "")
      nextErrors.files = "Please upload at least one file";
    if (!isUnlimitedViews) {
      if (!maxViews || clampViews(maxViews) < 1)
        nextErrors.max_views = "Enter at least 1 view";
    }

    if (ipRestrictions.trim()) {
      const ipv4Regex =
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

      if (!ipv4Regex.test(ipRestrictions.trim())) {
        nextErrors.allowed_ip =
          "Please enter a valid IPv4 address (e.g., 192.168.1.1)";
      }
    }

    if (password && !confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    }

    nextErrors = {
      ...nextErrors,
      ...validatePasswords(password, confirmPassword),
    };

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const isButtonDisabled = () => {
    // No files uploaded
    if (
      (files.length === 0 && message === "") ||
      uploadingFiles.size > 0 ||
      loading
    )
      return true;

    const hasErrorFiles = files.some((f) => f.status === "error");
    if (hasErrorFiles) return true;

    return false;
  };

  const createSecret = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      // Calculate expiration time and timezone
      const { expiresAt, timezone } = calculateExpiration(lifetime);

      // Generate share URL
      const result = await generateShareUrl({
        files: uploadedUrls,
        message: message.trim() || null,
        password: password || null,
        maxViews: isUnlimitedViews ? null : parseInt(maxViews) || null,
        expiresAt,
        allowedIp: ipRestrictions.trim() || null,
        timezone,
      });

      console.log("API Response:", result);

      // Navigate to created page with navigation state
      navigate(`/created`, {
        state: {
          id: result.id,
          result: result,
        },
      });
    } catch (error) {
      if (error.response?.data) {
        const backendErrors = {};
        for (const [key, value] of Object.entries(error.response.data)) {
          backendErrors[key] = Array.isArray(value) ? value[0] : String(value);
        }
        setErrors(backendErrors);
      } else {
        setErrors((prev) => ({
          ...prev,
          api: "Failed to create secret link. Please try again.",
        }));
      }
    } finally {
      setLoading(false);
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
    setFiles([]);
    setUploadingFiles(new Set());
    setUploadProgress({});
    setSuccessFiles(new Set());
    setUploadedUrls([]);
  };

  const handleFileUpload = async (fileData) => {
    try {
      setUploadingFiles((prev) => new Set(prev).add(fileData.id));

      // Start progress simulation
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15; // Random increment between 0-15
        if (progress > 90) progress = 90; // Don't go to 100% until upload completes
        setUploadProgress((prev) => ({ ...prev, [fileData.id]: progress }));
      }, 200);

      // Upload file using API service
      const result = await uploadFile(fileData.file, false);

      // Complete the progress bar
      clearInterval(progressInterval);
      setUploadProgress((prev) => ({ ...prev, [fileData.id]: 100 }));

      // Add the URL to the uploaded URLs array
      if (result.url) {
        setUploadedUrls((prev) => [...prev, result.url]);
      }

      // Show success tick for 1 second
      setSuccessFiles((prev) => new Set(prev).add(fileData.id));

      setTimeout(() => {
        setSuccessFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileData.id);
          return newSet;
        });
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileData.id);
          return newSet;
        });
      }, 1000);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id
            ? { ...f, status: "success", uploadResult: result }
            : f
        )
      );
    } catch (error) {
      console.error("Upload error:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id
            ? { ...f, status: "error", error: error.message }
            : f
        )
      );
    } finally {
      // Only clean up if not in success state (success cleanup is handled in setTimeout)
      if (!successFiles.has(fileData.id)) {
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileData.id);
          return newSet;
        });
      }
      // Clean up progress
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileData.id];
        return newProgress;
      });
    }
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

    // Start uploading each file immediately
    incoming.forEach((fileData) => {
      handleFileUpload(fileData);
    });
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

  const removeFile = (id, url) => {
    setUploadedUrls((prev) => prev.filter((u) => u !== url));
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const retryUpload = (fileData) => {
    // Reset the file status to ready and start upload again
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileData.id ? { ...f, status: "ready", error: null } : f
      )
    );
    handleFileUpload(fileData);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 pt-10 pb-16">
      {/* Logo + Title */}
      <div className="text-center mb-8">
        {" "}
        <img
          onClick={resetForm}
          src="/logo.png"
          alt="Logo"
          className="mx-auto w-auto h-16 mb-2 cursor-pointer"
        />
        <p className="text-gray-300  mx-auto font-[400] text-[20px] md:text-[28px]">
          Send notes and files anonymously <br className="hidden sm:block" />
          with self-destruct system
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-[#0e0e0e] border border-zinc-800 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white">New Message </label>
            <div className="flex items-center gap-2 text-xs text-gray-400 relative">
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip((prev) => !prev)}
              >
                <Warn className="text-lg cursor-pointer" />

                {/* Tooltip */}
                <div
                  className={`absolute left-1/2 top-full mt-2 -translate-x-1/2 w-[120px] p-2 rounded-md bg-black text-white text-[10px] shadow-md transition-opacity duration-200 md:hidden ${
                    showTooltip ? "opacity-100 visible" : "opacity-0 invisible"
                  }`}
                >
                  Tip: If you want to achieve top security use{" "}
                  <a
                    href="https://neurorsa.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline"
                  >
                    neuro RSA
                  </a>
                  <div className="absolute left-1/2 -top-1 w-4 h-4 bg-black rotate-45 -translate-x-1/2"></div>
                </div>
              </div>

              <span className="flex items-center gap-1">
                <span className="text-white md:block hidden">Tip: </span>
                <span className="md:block hidden">
                  If you want to achieve top security use{" "}
                </span>
                <a
                  href="https://neurorsa.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 cursor-pointer underline"
                >
                  {" "}
                  neuro RSA
                </a>
              </span>
            </div>
          </div>
          <textarea
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-28 rounded-md bg-[#161616] border border-zinc-800 text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {/* File Upload */}
        <div>
          <label className="text-white block mb-2">Upload a File</label>
          {errors.files && (
            <p className="text-xs text-red-500 mb-2">{errors.files}</p>
          )}
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
                {files.map((f) => {
                  const isUploading = uploadingFiles.has(f.id);
                  const isSuccess = successFiles.has(f.id);
                  const isError = f.status === "error";

                  return (
                    <div
                      key={f.id}
                      className={`rounded-md border h-[59px] ${
                        isError
                          ? "border-red-500 hover:border-red-400 hover:bg-red-900/20"
                          : "border-zinc-800"
                      } bg-black/80 px-4 py-3 text-gray-200 relative transition-colors`}
                    >
                      {isUploading ? (
                        // Show loader during upload
                        <div className="flex items-center h-full gap-2">
                          <div className="w-[30%] bg-[#9C1EE9] h-full rounded-md flex justify-center items-center">
                            <div className="spinner relative w-5 h-5">
                              <div className="absolute inset-0 rounded-full border-3 border-white"></div>
                              <div className="absolute inset-0 rounded-full border-3 border-gray-400 border-t-transparent animate-spin"></div>
                            </div>
                          </div>
                          <div className="flex-1 bg-gray-700 rounded-full h-1">
                            <div
                              className="bg-[#28E470] h-1 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress[f.id] || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : isSuccess ? (
                        // Show success tick for 1 second
                        <div className="flex items-center h-full gap-2">
                          <div className="w-[30%] bg-[#9C1EE9] h-full rounded-md flex justify-center items-center">
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 bg-green-500 rounded-full h-1"></div>
                        </div>
                      ) : (
                        // Show file info when not uploading
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={`min-w-0 flex-1 ${
                                isError ? "cursor-pointer" : ""
                              }`}
                              onClick={
                                isError ? () => retryUpload(f) : undefined
                              }
                              title={isError ? "Click to retry upload" : ""}
                            >
                              <p className="text-sm truncate">{f.name}</p>
                              <p className="text-xs text-gray-400">
                                {formatBytes(f.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                removeFile(f.id, f.uploadResult.url)
                              }
                              className="cursor-pointer flex-shrink-0"
                              title="Remove"
                            >
                              <FiTrash2 className="text-red-800" />
                            </button>
                          </div>

                          {isError && (
                            <div className="mt-3 text-xs -ml-3 text-red-800 flex items-center gap-1">
                              <PiWarningCircleLight className="inline" />{" "}
                              <span className="hover:underline">
                                Failed, click to retry
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* Lifetime + Max Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lifetime */}
          <div>
            <label className="text-white w-full mb-2 flex justify-between items-center">
              <span>Lifetime</span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <div className="relative" ref={lifetimeRef}>
              <button
                type="button"
                onClick={() => setIsLifetimeOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 rounded-md bg-black/80 border p-3 focus:outline-none focus:ring-2 focus:ring-brand text-gray-200 ${
                  errors.expires_at ? "border-red-500" : "border-zinc-800"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isLifetimeOpen}
              >
                {errors.expires_at && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.expires_at}
                  </p>
                )}
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
                max={999}
                value={isUnlimitedViews ? "" : maxViews}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (Number(val) <= 999 && val.length <= 3)) {
                    handleMaxViewsChange(e);
                  }
                }}
                disabled={isUnlimitedViews}
                placeholder={isUnlimitedViews ? "∞" : "Enter views"}
                className={`w-full rounded-md bg-black/80 border text-gray-200 p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  errors.max_views ? "border-red-500" : "border-zinc-800"
                } ${isUnlimitedViews ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              {errors.max_views && (
                <p className="text-xs text-red-500 mt-1">{errors.max_views}</p>
              )}
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
            <label className="text-white w-full mb-2 flex justify-between items-center">
              <span> Password </span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                const val = e.target.value;
                setPassword(val);
                validatePasswords(val, confirmPassword);
              }}
              className={`w-full rounded-md bg-black/80 border text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand ${
                errors.password ? "border-red-500" : "border-zinc-800"
              } `}
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
          <div>
            <label className="text-white w-full mb-2 flex justify-between items-center">
              <span> Confirm Password </span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                const val = e.target.value;
                setConfirmPassword(val);
                validatePasswords(password, val);
              }}
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
          <div className="relative">
            <label className="text-white flex mb-2 justify-between items-center">
              <span> IP restrictions</span>
              <span className="text-gray-500 text-sm">( Optional )</span>
            </label>
            <input
              type="text"
              value={ipRestrictions}
              onChange={(e) => {
                const value = e.target.value;

                if (/^[0-9.,:]*$/.test(value)) {
                  setIpRestrictions(value);
                }
                if (errors.allowed_ip) {
                  setErrors((prev) => {
                    const { allowed_ip, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              className={`w-full rounded-md bg-black/80 border text-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand
                ${errors.allowed_ip ? "border-red-500" : "border-zinc-800"}`}
            />
            {errors.allowed_ip && (
              <p className="absolute text-xs text-red-500 mt-1">
                {errors.allowed_ip}
              </p>
            )}
          </div>
          <div>
            <button
              onClick={createSecret}
              disabled={isButtonDisabled()}
              className={`w-full flex justify-center items-center gap-2 font-semibold px-8 py-3 mt-2 md:mt-0 rounded-md transition ${
                isButtonDisabled()
                  ? "bg-purple-700 text-gray-300 cursor-not-allowed"
                  : "bg-brand text-white cursor-pointer hover:py-3.5 hover:bg-gradient-to-r hover:from-[#9C1EE9] hover:via-[#F82BAB] hover:to-[#FFC94B]"
              }`}
            >
              Create a Secret Link
              {loading && <ThreeDots height="25" width="25" color="white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
