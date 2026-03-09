import { Op, WhereOptions } from "sequelize";
import {
  format,
  isBefore,
  isToday,
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek
} from "date-fns";
import SocialBoard from "../../models/SocialBoard";
import SocialStage from "../../models/SocialStage";
import SocialContent from "../../models/SocialContent";
import User from "../../models/User";

interface Request {
  companyId: number;
  boardId: number;
  search?: string;
  stageId?: number;
  platform?: string;
  contentType?: string;
  startDate?: string;
  endDate?: string;
}

const normalizeDate = (value?: Date | string): string | null => {
  if (!value) return null;
  const parsed = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "yyyy-MM-dd");
};

const GetSocialBoardOverviewService = async ({
  companyId,
  boardId,
  search,
  stageId,
  platform,
  contentType,
  startDate,
  endDate
}: Request): Promise<any> => {
  const board = await SocialBoard.findOne({
    where: { id: boardId, companyId }
  });

  if (!board) {
    return null;
  }

  const stages = await SocialStage.findAll({
    where: { companyId, boardId },
    order: [["order", "ASC"]]
  });

  const where: WhereOptions = {
    companyId,
    boardId
  };

  if (search) {
    (where as any)[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { copyText: { [Op.iLike]: `%${search}%` } },
      { scriptText: { [Op.iLike]: `%${search}%` } },
      { entityName: { [Op.iLike]: `%${search}%` } }
    ];
  }

  if (stageId) {
    (where as any).stageId = stageId;
  }

  if (platform) {
    (where as any).platform = platform;
  }

  if (contentType) {
    (where as any).contentType = contentType;
  }

  if (startDate || endDate) {
    (where as any).publishDate = {};
    if (startDate) (where as any).publishDate[Op.gte] = startDate;
    if (endDate) (where as any).publishDate[Op.lte] = endDate;
  }

  const contents = await SocialContent.findAll({
    where,
    include: [
      { model: SocialStage, as: "stage", attributes: ["id", "name", "color", "order"] },
      { model: User, as: "responsible", attributes: ["id", "name"] }
    ],
    order: [
      ["publishDate", "ASC"],
      ["publishTime", "ASC"],
      ["order", "ASC"],
      ["createdAt", "DESC"]
    ]
  });

  const stageMap = new Map<number, any>(
    stages.map(stage => [stage.id, { ...stage.toJSON(), contents: [] }])
  );

  contents.forEach(content => {
    const target = stageMap.get(content.stageId);
    if (target) {
      target.contents.push(content);
    }
  });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const stageNameCount = (needle: string) =>
    contents.filter(item => {
      const name = (item.stage?.name || "").toLowerCase();
      return name.includes(needle.toLowerCase());
    }).length;

  const metricDate = (item: SocialContent): Date | null => {
    const normalized = normalizeDate(item.publishDate);
    if (!normalized) return null;
    const full = item.publishTime ? `${normalized}T${item.publishTime}:00` : `${normalized}T00:00:00`;
    const parsed = parseISO(full);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const overdueCount = contents.filter(item => {
    const stageName = (item.stage?.name || "").toLowerCase();
    if (stageName.includes("publicado")) return false;
    const date = metricDate(item);
    return Boolean(date && isBefore(date, today) && !isToday(date));
  }).length;

  const metrics = {
    totalContents: contents.length,
    inPlanning: stageNameCount("planejamento"),
    inProduction: stageNameCount("produção"),
    inReview: stageNameCount("revisão"),
    scheduled: stageNameCount("agendado"),
    published: stageNameCount("publicado"),
    publishToday: contents.filter(item => {
      const date = metricDate(item);
      return Boolean(date && isToday(date));
    }).length,
    publishWeek: contents.filter(item => {
      const date = metricDate(item);
      return Boolean(date && isWithinInterval(date, { start: weekStart, end: weekEnd }));
    }).length,
    overdue: overdueCount
  };

  return {
    board,
    stages: Array.from(stageMap.values()),
    contents,
    metrics
  };
};

export default GetSocialBoardOverviewService;

