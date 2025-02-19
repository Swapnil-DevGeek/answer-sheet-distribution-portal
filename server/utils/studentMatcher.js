const extractStudentId = (filename) => {
  // Match BITS ID pattern (e.g., 2023A8PS0448G)
  const match = filename.match(/\d{4}[A-Z]\d?[A-Z]{2}\d{4}[A-Z]/);
  return match ? match[0] : null;
};

const getEmailFromId = (studentId) => {
  // Extract the numeric part (e.g., 0448 from 2023A8PS0448G)
  const numericPart = studentId.match(/\d{4}(?=[A-Z]$)/)[0];
  return `f2023${numericPart}@goa.bits-pilani.ac.in`;
};

module.exports = { extractStudentId, getEmailFromId };