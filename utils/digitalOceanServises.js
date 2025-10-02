const AWS = require("aws-sdk");
const path = require("path");

// Load env vars
require("dotenv").config();

// Configure AWS with DigitalOcean Spaces keys
AWS.config.update({
	accessKeyId: process.env.DO_SPACES_KEY.trim(),
	secretAccessKey: process.env.DO_SPACES_SECRET.trim(),
	region: "sfo3", // DO Spaces always uses "us-east-1" for region in AWS SDK
	signatureVersion: "v4"
});

// Create S3 service object with DigitalOcean endpoint
const s3 = new AWS.S3({
	endpoint: new AWS.Endpoint("https://sfo3.digitaloceanspaces.com"),
	// change `nyc3` → your region (e.g. "sgp1", "fra1", "ams3")
	s3ForcePathStyle: false,
	correctClockSkew: true
});

// Upload function
const uploadFileToSpaces = async (file, folder = "uploads") => {
	try {
		console.log(file);
		const fileExt = path.extname(file.originalname);
		const nameWithoutExt = path.parse(file.originalname).name;

		const key = `${folder}/${Date.now()}${nameWithoutExt}${fileExt}`;

		const params = {
			Bucket: process.env.DO_SPACES_BUCKET, // Your Space name
			Key: key,
			Body: file.buffer,
			ContentType: file.mimetype,
			ACL: "public-read" // make public or remove if private
		};

		const uploadResult = await s3.upload(params).promise();
		console.log(uploadResult);
		return uploadResult.Key; // Returns full public URL
	} catch (error) {
		console.error("Spaces Upload Error:", error);
		throw error;
	}
};

// Get file URL
const getFileUrl = (key) => {
	if (!key) return null;
	return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${key}`;
};

module.exports = {
	uploadFileToSpaces,
	getFileUrl
};
