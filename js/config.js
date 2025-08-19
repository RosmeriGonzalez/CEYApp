// js/config.js
// Config por defecto: 10 estudiantes base.
// Se guardan y sobrescriben en LocalStorage cuando admin agrega/elimina.

window.CEYAPP_CONFIG = {
  version: "v1",
  adminUser: "CEYAdmin",
  adminPass: "CEYAdmin2025",
  altUser: "Alternativo",
  altPass: "Alternativo2025",
  normalPasswords: ["1234"],

  // Lista inicial (editable en runtime por el admin)
  defaultStudents: [
    "Estudiante 1",
    "Estudiante 2",
    "Estudiante 3",
    "Estudiante 4",
    "Estudiante 5",
    "Estudiante 6",
    "Estudiante 7",
    "Estudiante 8",
    "Estudiante 9",
    "Estudiante 10"
  ]
};