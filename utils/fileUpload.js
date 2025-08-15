// function fileUpload(dest) {
// 	const multer = require("multer");

// 	const fileStorage = multer.diskStorage({
// 		destination: (req, file, cb) => {
// 			cb(null, `./uploads/${dest}`);
// 		},
// 		filename: (req, file, cb) => {
// 			("dasdasd");

// 			let fileName = file.originalname.split(" ").join("-");
// 			cb(null, Date.now().toString() + "-" + fileName);
// 		}
// 	});
// 	const upload = multer({
// 		storage: fileStorage,
// 		fileFilter: (req, files, cb) => {
// 			files.mimetype;
// 			if (
// 				files.mimetype === "application/pdf" ||
// 				files.mimetype === "text/csv" ||
// 				files.mimetype == "image/png" ||
// 				files.mimetype === "image/jpeg" ||
// 				files.mimetype == "application/octet-stream"
// 			) {
// 				cb(null, true);
// 			} else {
// 				cb(null, false);
// 				return cb(new Error("only PDF files are allowed"));
// 			}
// 		},
// 		limit: { fileSize: 1024 }
// 	});
// 	return {
// 		upload: upload
// 	};
// }

function fileUpload(dest) {
	const multer = require("multer");

	const fileStorage = multer.diskStorage({
		destination: (req, file, cb) => {
			cb(null, `./uploads/${dest}`);
		},
		filename: (req, file, cb) => {
			let fileName = file.originalname.split(" ").join("-");
			cb(null, Date.now().toString() + "-" + fileName);
		}
	});
	// multer.memoryStorage()
	const upload = multer({ storage: multer.memoryStorage() });
	return {
		upload: upload
	};
}
module.exports = fileUpload;
