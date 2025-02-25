const extractStudentId = (filename) => {
  // Convert to uppercase and remove .pdf extension
  const cleanName = filename.toUpperCase().replace(/\.PDF$/i, '');
  
  // Updated regex to handle IDs like 2022A8B10333G
  // \d{4} - four digits for year
  // [A-Z] - one letter (A)
  // \d - one digit (8)
  // [A-Z]{1,3} - one to three letters (B, PS, etc.)
  // \d{4,5} - four or five digits for ID
  // [A-Z] - campus letter
  const regex = /^(\d{4}[A-Z]\d[A-Z]{1,3}\d{4,5}[A-Z])/;
  const match = cleanName.match(regex);
  return match ? match[1] : null;

};

const getEmailFromId = (studentId) => {
  // Extract first 4 digits (year) and last 4 digits (number) from ID
  const year = studentId.substring(0, 4);
  // Updated to correctly extract the last 4 digits before campus letter
  const number = studentId.match(/(\d{4})[A-Z]$/)[1];
  return `f${year}${number}@goa.bits-pilani.ac.in`;
};

module.exports = {
  extractStudentId,
  getEmailFromId
};