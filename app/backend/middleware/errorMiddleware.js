import multer from 'multer';

const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
};

// Multer errors reach this handler with res.statusCode still at 200: map them explicitly,
// otherwise a too-large upload would come out as a 500.
const getStatusCode = (err, res) => {
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  }
  if (err.statusCode) {
    return err.statusCode;
  }
  return res.statusCode !== 200 ? res.statusCode : 500;
};

const errorHandler = (err, req, res, next) => {
  const statusCode = getStatusCode(err, res);
  res.status(statusCode);

  const responseBody = {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  };

  console.error('Error: ', responseBody);
  res.json(responseBody);
};

export { notFound, errorHandler };
