// Функция для получения текущей даты и времени в Далласе
function getDallasDateTime() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour12: true,
  });
}

// Функция для форматирования даты в формат Далласа
function formatDallasDate(date) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDallasDateForServer(dateString) {
  const [month, day, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} 00:00:00`;
}

// Функция для получения только даты в формате Далласа
function getDallasDate() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// Функция для проверки, является ли дата сегодняшней (по времени Далласа)
function isDallasToday(date) {
  const dallasToday = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const checkDate = new Date(date).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return dallasToday === checkDate;
}
