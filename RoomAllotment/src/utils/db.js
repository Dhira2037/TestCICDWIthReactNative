import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase({ name: 'room_db.db' });

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT);`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        floor TEXT,
        roomNumber TEXT,
        acType TEXT,
        totalBeds INTEGER,
        occupiedBeds INTEGER
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS room_allotments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId INTEGER,
    name TEXT,
    bedNumber INTEGER,
    createdAt TEXT,
    FOREIGN KEY (roomId) REFERENCES rooms(id)
  );`
    );
  });
};

export const getDB = () => db;