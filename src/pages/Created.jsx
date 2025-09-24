import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiDownload, FiTrash2 } from "react-icons/fi";
import { IoCopyOutline, IoCheckmarkOutline } from "react-icons/io5";
import { Creat, Url } from "../assets/Icons";
// No storage; read data from navigation state

export default function Created() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // On first mount, read from location.state
    setData(location.state || null);
  }, [location.state]);

  const copyUrl = async () => {
    if (!data?.secretUrl) return;
    try {
      await navigator.clipboard.writeText(data.secretUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (_) {}
  };

  const reset = () => {
    setData(null);
    navigate("/");
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center px-4 pt-10 pb-16 text-gray-200">
        <img src="/logo.png" alt="Logo" className="mx-auto w-auto h-16 mb-2" />
        <p className="mb-6">Nothing saved or it has expired.</p>
        <Link
          to="/"
          className="bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2.5 rounded-md"
        >
          Go Home
        </Link>
      </div>
    );
  }

  const { secretUrl } = data;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 pt-10 pb-16">
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Logo" className="mx-auto w-auto h-16 mb-2" />
      </div>
      <div className="w-full max-w-4xl bg-[#0e0e0e] border border-zinc-800 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        <div>
          <label className="text-white mb-2 flex items-center gap-2">
            Your secret URL <Url />
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={secretUrl}
              className="w-full rounded-md bg-[#161616] border border-zinc-800 text-gray-300 p-3 pr-12"
            />
            <button
              onClick={copyUrl}
              className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <IoCheckmarkOutline /> : <IoCopyOutline />}
            </button>
          </div>
        </div>

        <div className="flex md:flex-row flex-col items-center justify-center gap-8 pt-2">
          <div className="ml-20">
            <p className="text-gray-300 text-sm mb-2">Access with QR code</p>
            <img
              alt="QR"
              className="w-48 h-48"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                secretUrl
              )}`}
            />
          </div>
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <FiDownload className="text-xl" />
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(
                secretUrl
              )}`}
              download="qrcode.png"
              className="underline"
            >
              Download
            </a>
          </div>
        </div>

        <div className="flex md:flex-row flex-col items-center justify-center gap-4 pt-2">
          <button
            onClick={reset}
            className="flex w-full md:w-auto justify-center items-center gap-2 bg-red-500/90 cursor-pointer hover:bg-red-600 text-white px-10 py-2.5 rounded-md"
          >
            <FiTrash2 />
            Delete
          </button>
          <Link
            to="/"
            className="flex w-full md:w-auto justify-center gap-2 items-center bg-brand hover:bg-brand-dark cursor-pointer text-white font-semibold px-10 py-2.5 rounded-md"
          >
            <Creat />
            Create New
          </Link>
        </div>
      </div>
    </div>
  );
}
