import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || "images";

// Initialize Supabase client if credentials exist
const initSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_KEY not configured. Supabase Storage service will fall back to local disk storage.");
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

const supabase = initSupabase();

/**
 * Uploads a file buffer to Supabase Storage.
 * Falls back to local directory writing if Supabase is not configured.
 * @param {Buffer} fileBuffer The raw file buffer
 * @param {string} fileName The name of the file to save
 * @param {string} mimeType The mime type of the file
 * @param {string} subFolder Subfolder like 'candidates' or 'profiles'
 */
export const uploadToSupabase = async (fileBuffer, fileName, mimeType, subFolder = "candidates") => {
  // Sanitize filename: replace spaces, commas, special chars with underscores.
  // This prevents URL-encoding issues (e.g. %20, %2C) in Supabase CDN links
  // which cause slow delivery and broken image renders.
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_") // replace anything not alphanumeric/dot/dash with _
    .replace(/_+/g, "_");              // collapse multiple consecutive underscores

  const uniqueName = `${subFolder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedName}`;

  // If Supabase is not configured, fall back to local file storage
  if (!supabase) {
    try {
      const localUploadDir = path.join(__dirname, "../uploads", subFolder);
      if (!fs.existsSync(localUploadDir)) {
        fs.mkdirSync(localUploadDir, { recursive: true });
      }

      const filePath = path.join(localUploadDir, fileName);
      fs.writeFileSync(filePath, fileBuffer);
      
      // Return relative path matching local Express static config
      return `/uploads/${subFolder}/${fileName}`;
    } catch (error) {
      console.error("❌ Local file storage fallback failed:", error.message);
      throw new Error("Failed to store image locally.");
    }
  }

  // Upload to Supabase Storage Bucket
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueName, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("❌ Supabase storage upload failed:", error.message);
    throw new Error("Failed to upload image to Supabase Storage.");
  }
};
