CREATE TABLE IF NOT EXISTS `session_questions` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `body`         LONGTEXT     NOT NULL,
  `displayName`  VARCHAR(191) NULL,
  `sessionToken` VARCHAR(191) NULL,
  `approved`     TINYINT(1)   NOT NULL DEFAULT 0,
  `answered`     TINYINT(1)   NOT NULL DEFAULT 0,
  `hidden`       TINYINT(1)   NOT NULL DEFAULT 0,
  `upvotes`      INT          NOT NULL DEFAULT 0,
  `adminNote`    LONGTEXT     NULL,
  `askedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
