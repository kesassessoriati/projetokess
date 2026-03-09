import MySiteBoardColumn from "../../models/MySiteBoardColumn";

const DEFAULT_COLUMNS = [
  { name: "Ferramentas", color: "#dff4e7" },
  { name: "Prospecção", color: "#e6f6ee" },
  { name: "Cursos em Andamento", color: "#eaf7ef" },
  { name: "Referências", color: "#f1faf4" }
];

interface Request {
  companyId: number;
}

const EnsureDefaultMySiteColumnsService = async ({ companyId }: Request): Promise<void> => {
  const count = await MySiteBoardColumn.count({ where: { companyId } });
  if (count > 0) return;

  await Promise.all(
    DEFAULT_COLUMNS.map((column, index) =>
      MySiteBoardColumn.create({
        companyId,
        name: column.name,
        color: column.color,
        order: index
      })
    )
  );
};

export default EnsureDefaultMySiteColumnsService;

