#![windows_subsystem = "windows"]

use std::net::TcpStream;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread::sleep;
use std::time::Duration;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn is_port_listening(port: u16) -> bool {
    TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok()
}

fn get_desktop_binary_path() -> Option<PathBuf> {
    let candidates = [
        "packages\\web\\src-tauri\\target\\release\\mint-studio.exe",
        "mint-studio.exe",
        "bin\\mint-studio.exe",
    ];

    for c in candidates {
        let p = Path::new(c);
        if p.exists() {
            return Some(p.to_path_buf());
        }
    }
    None
}

fn main() {
    // 1. Asegurar que PostgreSQL 16 esté activo en el puerto 5432
    if !is_port_listening(5432) {
        let _ = Command::new("cmd.exe")
            .args(&["/c", "docker compose up -d postgres"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        // Esperar hasta 5 segundos a que el puerto 5432 responda
        for _ in 0..20 {
            if is_port_listening(5432) {
                break;
            }
            sleep(Duration::from_millis(250));
        }
    }

    // 2. Asegurar que el Backend Fastify API esté activo en el puerto 3001
    if !is_port_listening(3001) {
        let _ = Command::new("cmd.exe")
            .args(&["/c", "npm.cmd run api"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        // Esperar hasta 8 segundos a que el puerto 3001 responda
        for _ in 0..32 {
            if is_port_listening(3001) {
                break;
            }
            sleep(Duration::from_millis(250));
        }
    }

    // 3. Abrir la ventana de la aplicación nativa
    if let Some(bin_path) = get_desktop_binary_path() {
        let _ = Command::new(bin_path).status();
    } else {
        // Fallback si no encuentra el release compilado: invocar npm run desktop
        let _ = Command::new("cmd.exe")
            .args(&["/c", "npm.cmd run desktop"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }
}
