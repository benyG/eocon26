CREATE TABLE `cfp_submissions` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(255) NOT NULL,
  `email`     VARCHAR(255) NOT NULL,
  `org`       VARCHAR(255),
  `country`   VARCHAR(100),
  `talkTitle` VARCHAR(255) NOT NULL,
  `format`    VARCHAR(100),
  `abstract`  TEXT         NOT NULL,
  `bio`       TEXT,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `volunteer_applications` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `phone`      VARCHAR(50),
  `city`       VARCHAR(100),
  `role`       VARCHAR(100),
  `experience` TEXT,
  `motivation` TEXT         NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registrations` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `fname`      VARCHAR(100) NOT NULL,
  `lname`      VARCHAR(100) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `org`        VARCHAR(255),
  `country`    VARCHAR(100),
  `ticketType` VARCHAR(100) NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
