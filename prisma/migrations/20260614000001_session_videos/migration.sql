CREATE TABLE session_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  titleEn TEXT,
  description TEXT,
  descriptionEn TEXT,
  youtubeUrl TEXT NOT NULL,
  thumbnailUrl TEXT,
  speaker TEXT,
  edition TEXT NOT NULL DEFAULT '2025',
  category TEXT,
  isVisible BOOLEAN NOT NULL DEFAULT 1,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
