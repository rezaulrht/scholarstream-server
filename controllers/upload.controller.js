const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const r2Client = require("../config/r2");

const getUploadUrls = async (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0 || files.length > 5) {
    return res.status(400).send({ message: "Provide 1–5 files" });
  }

  for (const f of files) {
    if (!f.fileName || !f.fileType) {
      return res.status(400).send({ message: "Each file needs fileName and fileType" });
    }
  }

  try {
    const userKey = req.decoded_email;
    const results = await Promise.all(
      files.map(async ({ fileName, fileType }) => {
        const key = `applications/${userKey}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${fileName}`;
        const command = new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: key,
          ContentType: fileType,
        });
        const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
        const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
        return { uploadUrl, fileUrl };
      })
    );

    res.send(results);
  } catch (error) {
    console.error("Error generating upload URLs:", error);
    res.status(500).send({ message: "Failed to generate upload URLs" });
  }
};

module.exports = { getUploadUrls };
