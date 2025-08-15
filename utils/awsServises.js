const AWS = require("aws-sdk");
const path = require("path");

// Configure AWS
require("dotenv").config();

console.log(process.env.AWS_ACCESS_KEY_ID);

// More robust AWS configuration
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
	region: "eu-north-1",
	signatureVersion: "v4" // Explicitly set signature version
});

// Create S3 service object with correct endpoint
const s3 = new AWS.S3({
	endpoint: "s3.eu-north-1.amazonaws.com", // Explicit endpoint
	correctClockSkew: true // Fixes time sync issues
});

const uploadFileToS3 = async (file, folder = "uploads") => {
	try {
		const fileExt = path.extname(file.originalname);
		const key = `${folder}/${Date.now()}${fileExt}`;

		const params = {
			Bucket: process.env.AWS_S3_BUCKET,
			Body: file.buffer, // Use the buffer from memory storage
			Key: key,
			ContentType: file.mimetype
			// ACL: "public-read" // or 'private' if needed
		};

		const uploadResult = await s3.upload(params).promise();
		return uploadResult.Key;
	} catch (error) {
		console.error("S3 Upload Error:", error);
		throw error;
	}
};

const getFileUrl = (key) => {
	if (!key) return null;
	return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

module.exports = {
	uploadFileToS3,
	getFileUrl
};
