-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: henrysimfdb
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agent_locations`
--

DROP TABLE IF EXISTS `agent_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_locations` (
  `agent_name` varchar(100) NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `accuracy` double DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`agent_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_locations`
--

LOCK TABLES `agent_locations` WRITE;
/*!40000 ALTER TABLE `agent_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `agent_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agent_teams`
--

DROP TABLE IF EXISTS `agent_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_teams` (
  `agent_id` int NOT NULL,
  `teammate_id` int NOT NULL,
  PRIMARY KEY (`agent_id`,`teammate_id`),
  KEY `teammate_id` (`teammate_id`),
  CONSTRAINT `agent_teams_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_teams_ibfk_2` FOREIGN KEY (`teammate_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_teams`
--

LOCK TABLES `agent_teams` WRITE;
/*!40000 ALTER TABLE `agent_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `agent_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agents`
--

DROP TABLE IF EXISTS `agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `bio` text,
  `profile_pic` varchar(255) DEFAULT 'default.png',
  `clearance_level` int DEFAULT '1',
  `location` varchar(255) DEFAULT 'Unknown',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `pin_hash` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `is_director` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `name` (`agent_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agents`
--

LOCK TABLES `agents` WRITE;
/*!40000 ALTER TABLE `agents` DISABLE KEYS */;
INSERT INTO `agents` VALUES (1,'Daddy-O','bluecollarcoding@gmail.com','','test','default.png',1,'Unknown','2025-07-13 23:08:27',NULL,'scrypt$aebe7b4803757d3bbdf4816fb7a084e4$de9b80dc9e8cfb77cfc1bf4b188c1a1c3a3b62ba610d71344305e825b31cbbd7f2dc33314616d3cb94937dfcac71f639b37aee08970a1f02a16c029a501049bf','active',1),(2,'Henry','email@email.com','','test','default.png',1,'Unknown','2025-07-14 02:38:14','scrypt$1fe51222c8b862d06355cb24d19e389f$23fb10426d4ff52d36b6a0c56f01674b433a76737e5f0d38fe0cfa26af21c4e8125199a6cb2c4ed8243ba1e482ce2fe4f504179edea061b1854946be23081305','scrypt$62027e1c23f86fa77f60dbd6fa2e7aa9$7c6a8a5b387dd427d8a4f7ce1b4648819066b76385c14f0980c8584705d8571595b7118316b42c1ce213ced0c20c2fd20b9dc4d043396de0e97d04dd2177edf7','active',0);
/*!40000 ALTER TABLE `agents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender` varchar(100) NOT NULL,
  `recipient` varchar(100) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,'Daddy-O','Henry','Hello Agent Henry!','2025-07-19 14:48:55','2025-07-19 09:48:55'),(2,'Daddy-O','Henry','test test test','2025-12-28 00:09:04','2025-12-27 18:09:04'),(3,'Daddy-O','Henry','testmessage','2025-12-28 01:35:02','2025-12-27 19:35:02'),(4,'Daddy-O','Henry','inbox test','2025-12-28 19:49:37','2025-12-28 13:49:37'),(5,'Daddy-O','Henry','inbox test 2','2025-12-28 20:18:31','2025-12-28 14:18:31'),(6,'Daddy-O','Henry','yoooooooo','2025-12-28 20:34:24','2025-12-28 14:34:24'),(7,'Daddy-O','Henry','test message again','2025-12-28 20:44:52','2025-12-28 14:44:52'),(8,'Daddy-O','Henry','inbox rwd test','2025-12-28 21:01:34','2025-12-28 15:01:34'),(9,'Daddy-O','Henry','test test','2025-12-28 21:02:07','2025-12-28 15:02:07'),(10,'Daddy-O','Henry','testing the inbox some more','2025-12-28 21:11:10','2025-12-28 15:11:10'),(11,'Daddy-O','Henry','Hi Henry, can you see this from mom\'s phone?','2025-12-29 19:00:25','2025-12-29 13:00:25'),(12,'Daddy-O','Henry','Yo buddy boy (test)','2026-10-17 16:00:42','2026-10-17 11:00:42'),(13,'Henry','Daddy-O','❤️ Love you!','2026-10-17 22:30:40',NULL),(14,'Henry','Daddy-O','😡 Grr!','2026-10-17 22:31:45',NULL),(15,'Henry','Daddy-O','💩 Poop','2026-10-17 22:31:47',NULL),(16,'Henry','Daddy-O','🥳 Party time!','2026-10-17 22:31:50',NULL),(17,'Henry','Daddy-O','okay buttons work (this is dad testing)','2026-10-17 22:32:02',NULL);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-17 18:30:04
