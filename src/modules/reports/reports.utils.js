export const buildWhereByRole = (user) => {
  const { role, leaderId, userId } = user

  let where = {}

  if (role === "LIDER") {
    where.leaderId = leaderId
  }

  if (role === "DIGITADOR") {
    where.digitadorId = userId
  }

  // ADMIN → ve todo
  return where
}

export const buildDashboardWhere = (user, query) => {
  const where = buildWhereByRole(user);

  // 📅 FECHAS
  if (query.desde || query.hasta) {
    where.createdAt = {};
    if (query.desde) where.createdAt.gte = new Date(query.desde);
    if (query.hasta) where.createdAt.lte = new Date(query.hasta);
  }

  // 📄 PLANILLA
  if (query.planilla) {
    where.planilla = Number(query.planilla);
  }

  // 🏢 PROGRAMA
  if (query.programaId) {
    where.programaId = query.programaId;
  }

  // 🏫 SEDE
  if (query.sedeId) {
    where.sedeId = query.sedeId;
  }

  // 👤 LÍDER (solo admin)
  if (query.leaderId && user.role === "ADMIN") {
    where.leaderId = query.leaderId;
  }

  return where;
};
