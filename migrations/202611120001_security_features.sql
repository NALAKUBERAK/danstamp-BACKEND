ALTER TABLE pago
  MODIFY COLUMN metodo ENUM(
    'efectivo',
    'transferencia',
    'tarjeta',
    'nequi',
    'daviplata',
    'bre-b',
    'bancolombia'
  ) NOT NULL;

ALTER TABLE pago
  ADD COLUMN estado ENUM('pendiente', 'validado', 'rechazado')
  NOT NULL DEFAULT 'pendiente' AFTER metodo;

UPDATE pago
SET estado = CASE
  WHEN fecha_validacion IS NULL THEN 'pendiente'
  ELSE 'validado'
END;

ALTER TABLE pedido
  MODIFY COLUMN estado ENUM(
    'pendiente',
    'en_proceso',
    'terminado',
    'entregado',
    'cancelado',
    'cotizacion',
    'cotizacion_enviada'
  ) NOT NULL DEFAULT 'pendiente';

ALTER TABLE producto
  ADD COLUMN imagen_public_id VARCHAR(255) NULL AFTER imagen_url;

CREATE TABLE password_reset_token (
  id INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY UQ_password_reset_token_hash (token_hash),
  KEY IDX_password_reset_user_expiry (id_usuario, expires_at),
  CONSTRAINT FK_password_reset_user
    FOREIGN KEY (id_usuario) REFERENCES users (id_usuario)
    ON DELETE CASCADE
) ENGINE=InnoDB;
