import axios from "axios";
import moment from "moment-timezone";

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://dev.api.ghosttransfer.tech";

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds timeout
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
    (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error("API Request Error:", error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        console.error("API Response Error:", error);
        return Promise.reject(error);
    }
);

/**
 * Upload a single file to the media API
 * @param {File} file - The file to upload
 * @param {boolean} isPublic - Whether the file should be public
 * @returns {Promise<Object>} - Upload response with URL
 */
export const uploadFile = async (file, isPublic = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("public", isPublic.toString());

    const response = await apiClient.post("/api/media/upload-file/", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};

/**
 * Generate a secret share URL
 * @param {Object} params - Share parameters
 * @param {string[]} params.files - Array of file URLs
 * @param {string|null} params.message - Optional message
 * @param {string|null} params.password - Optional password
 * @param {number|null} params.maxViews - Maximum number of views
 * @param {string|null} params.expiresAt - Expiration datetime (naive format)
 * @param {string|null} params.allowedIp - Allowed IP addresses
 * @param {string|null} params.timezone - Timezone for expiration
 * @returns {Promise<Object>} - Generated share response
 */
export const generateShareUrl = async ({
    files,
    message = null,
    password = null,
    maxViews = null,
    expiresAt = null,
    allowedIp = null,
    timezone = null,
}) => {
    const requestBody = {
        files,
        message,
        password,
        max_views: maxViews,
        expires_at: expiresAt,
        allowed_ip: allowedIp,
        timezone,
    };

    // Remove null/undefined values
    Object.keys(requestBody).forEach((key) => {
        if (requestBody[key] === null || requestBody[key] === undefined) {
            delete requestBody[key];
        }
    });

    console.log("Generating share URL with params:", requestBody);

    const response = await apiClient.post("/api/file-share/generate-url/", requestBody);

    console.log("API Response:", response.data);
    return response.data;
};

/**
 * Auto-detect user timezone
 * @returns {string} - Detected timezone or fallback
 */
export const detectTimezone = () => {
    try {
        return moment.tz.guess();
    } catch (error) {
        console.warn("Could not detect timezone, using fallback:", error);
        return "Asia/Karachi";
    }
};

/**
 * Calculate expiration time based on lifetime selection
 * @param {string} lifetime - Lifetime option (5m, 30m, 1h, etc.)
 * @returns {Object} - { expiresAt: string|null, timezone: string }
 */
export const calculateExpiration = (lifetime) => {
    const timezone = detectTimezone();
    let expiresAt = null;

    if (lifetime) {
        const now = moment();
        let expirationTime;

        switch (lifetime) {
            case "5m":
                expirationTime = now.clone().add(5, "minutes");
                break;
            case "30m":
                expirationTime = now.clone().add(30, "minutes");
                break;
            case "1h":
                expirationTime = now.clone().add(1, "hour");
                break;
            case "4h":
                expirationTime = now.clone().add(4, "hours");
                break;
            case "12h":
                expirationTime = now.clone().add(12, "hours");
                break;
            case "1d":
                expirationTime = now.clone().add(1, "day");
                break;
            case "3d":
                expirationTime = now.clone().add(3, "days");
                break;
            case "7d":
                expirationTime = now.clone().add(7, "days");
                break;
            default:
                expirationTime = null;
        }

        if (expirationTime) {
            // Format as naive datetime (no timezone info) - format: 2025-09-27T15:40:59
            expiresAt = expirationTime.format("YYYY-MM-DDTHH:mm:ss");
        }
    }

    return { expiresAt, timezone };
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${sizes[i]}`;
};

// Export API base URL for use in other components
export { API_BASE_URL };

export default apiClient;
