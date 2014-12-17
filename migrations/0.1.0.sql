CREATE DATABASE  IF NOT EXISTS `helium` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `helium`;
-- MySQL dump 10.13  Distrib 5.6.19, for osx10.7 (i386)
--
-- Host: 127.0.0.1    Database: helium
-- ------------------------------------------------------
-- Server version	5.6.22

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `article`
--

DROP TABLE IF EXISTS `article`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `article` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_url` varchar(255) NOT NULL,
  `author` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `published_on` datetime DEFAULT NULL,
  `private` bit(1) NOT NULL DEFAULT b'0',
  `modified` bit(1) NOT NULL DEFAULT b'0',
  `created_on` datetime NOT NULL,
  `modified_on` datetime NOT NULL,
  `title_modified` varchar(255) DEFAULT NULL,
  `language` varchar(2) NOT NULL DEFAULT 'en',
  `hidden` bit(1) NOT NULL DEFAULT b'0',
  `private_modified` bit(1) NOT NULL DEFAULT b'0',
  `hidden_modified` bit(1) NOT NULL DEFAULT b'0',
  `comments` bit(1) NOT NULL DEFAULT b'1',
  `comments_modified` bit(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_url_UNIQUE` (`id_url`),
  KEY `publishedOn_idx` (`published_on`),
  KEY `author_idx` (`author`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `article`
--

LOCK TABLES `article` WRITE;
/*!40000 ALTER TABLE `article` DISABLE KEYS */;
/*!40000 ALTER TABLE `article` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `article_body`
--

DROP TABLE IF EXISTS `article_body`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `article_body` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `article` bigint(20) NOT NULL,
  `body` text,
  `body_modified` text,
  `bodycut` text,
  `cut` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  KEY `Article_idx` (`article`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `article_body`
--

LOCK TABLES `article_body` WRITE;
/*!40000 ALTER TABLE `article_body` DISABLE KEYS */;
/*!40000 ALTER TABLE `article_body` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `config`
--

DROP TABLE IF EXISTS `config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `config` (
  `id` varchar(255) NOT NULL,
  `data` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `config`
--

LOCK TABLES `config` WRITE;
/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` VALUES ('about','2'),('disqus','DisqusUsername'),('navbar','[   {     \"id\": \"Blog\",     \"type\": 0   },   {     \"id\": \"Open Source\",     \"type\": 2,     \"entries\": [       {         \"id\": \"Test Entry\",         \"article\": 2       }   ]   },   {     \"id\": \"Services\",     \"type\": 1,     \"article\": 2   } ]'),('privacy','2'),('terms','2'),('title','Helium Portal');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `folder_file`
--

DROP TABLE IF EXISTS `folder_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `folder_file` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `key` varchar(255) DEFAULT NULL,
  `thumb_key` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `thumb_url` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `parent_folder` bigint(20) DEFAULT NULL,
  `size` bigint(20) DEFAULT '0',
  `created_on` datetime NOT NULL,
  `modified_on` datetime NOT NULL,
  `user` bigint(20) NOT NULL,
  `type` smallint(6) NOT NULL DEFAULT '0',
  `is_folder` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  KEY `album_idx` (`parent_folder`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `folder_file`
--

LOCK TABLES `folder_file` WRITE;
/*!40000 ALTER TABLE `folder_file` DISABLE KEYS */;
/*!40000 ALTER TABLE `folder_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_email`
--

DROP TABLE IF EXISTS `token_email`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_email` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user` bigint(20) NOT NULL,
  `token` varchar(45) NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id_idx` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_email`
--

LOCK TABLES `token_email` WRITE;
/*!40000 ALTER TABLE `token_email` DISABLE KEYS */;
/*!40000 ALTER TABLE `token_email` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_login`
--

DROP TABLE IF EXISTS `token_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_login` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user` bigint(20) NOT NULL,
  `token` varchar(45) NOT NULL,
  `date` datetime NOT NULL,
  `ip4` int(10) unsigned DEFAULT NULL,
  `ip6` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `token_idx` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_login`
--

LOCK TABLES `token_login` WRITE;
/*!40000 ALTER TABLE `token_login` DISABLE KEYS */;
/*!40000 ALTER TABLE `token_login` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `uni_tag`
--

DROP TABLE IF EXISTS `uni_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `uni_tag` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `uni_tag`
--

LOCK TABLES `uni_tag` WRITE;
/*!40000 ALTER TABLE `uni_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `uni_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name_first` varchar(45) DEFAULT NULL,
  `name_last` varchar(45) DEFAULT NULL,
  `email` varchar(60) NOT NULL,
  `pass_hash` varchar(45) NOT NULL,
  `pass_salt` varchar(45) NOT NULL,
  `level` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'First','Last','first.last@email.com','6e8cd8e18e21669ebe2cf30bea272d5e14a614e1','4aeefc3fe5120ba85d4675980f836a5fe900d907',0);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_article_tag`
--

DROP TABLE IF EXISTS `user_article_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_article_tag` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user` bigint(20) NOT NULL,
  `article` bigint(20) NOT NULL,
  `tag` int(11) NOT NULL,
  `live` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  KEY `article_key_idx` (`article`),
  KEY `tag_key_idx` (`tag`),
  KEY `user_key_idx` (`user`),
  CONSTRAINT `article_key` FOREIGN KEY (`article`) REFERENCES `article` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `tag_key` FOREIGN KEY (`tag`) REFERENCES `uni_tag` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `user_key` FOREIGN KEY (`user`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=306 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_article_tag`
--

LOCK TABLES `user_article_tag` WRITE;
/*!40000 ALTER TABLE `user_article_tag` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_article_tag` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2014-12-17 10:42:14
