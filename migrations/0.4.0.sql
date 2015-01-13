ALTER TABLE `article`
ADD COLUMN `id_url_modified` VARCHAR(255) NULL DEFAULT NULL AFTER `comments_modified`;
