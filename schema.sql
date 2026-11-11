CREATE DATABASE IF NOT EXISTS clinique_effort
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinique_effort;

CREATE TABLE IF NOT EXISTS specialites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS medecins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  specialite_id INT NOT NULL,
  telephone VARCHAR(20),
  photo_url VARCHAR(255),
  actif BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (specialite_id) REFERENCES specialites(id)
);
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150),
  date_naissance DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS personnel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  role ENUM('admin', 'secretaire', 'medecin') NOT NULL,
  medecin_id INT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (medecin_id) REFERENCES medecins(id)
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personnel_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS disponibilites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medecin_id INT NOT NULL,
  jour_semaine TINYINT NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  FOREIGN KEY (medecin_id) REFERENCES medecins(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rendez_vous (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  medecin_id INT NOT NULL,
  date_heure DATETIME NOT NULL,
  duree_minutes INT NOT NULL DEFAULT 30,
  motif TEXT,
  statut ENUM('en_attente', 'confirme', 'annule', 'termine') DEFAULT 'en_attente',
  origine ENUM('en_ligne', 'presentiel') DEFAULT 'en_ligne',
  present BOOLEAN DEFAULT FALSE,
  note_medecin TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (medecin_id) REFERENCES medecins(id),
  UNIQUE KEY no_double_booking (medecin_id, date_heure)
);
