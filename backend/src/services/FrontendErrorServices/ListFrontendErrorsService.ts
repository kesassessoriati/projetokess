import { Op } from "sequelize";
import FrontendError from "../../models/FrontendError";
import Company from "../../models/Company";
import User from "../../models/User";

interface Request {
    companyId?: string | number;
    severity?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    pageNumber?: string;
}

interface Response {
    frontendErrors: FrontendError[];
    count: number;
    hasMore: boolean;
}

const ListFrontendErrorsService = async ({
    companyId,
    severity,
    status,
    dateFrom,
    dateTo,
    pageNumber = "1"
}: Request): Promise<Response> => {
    const whereCondition: any = {};

    if (companyId) whereCondition.companyId = companyId;
    if (severity) whereCondition.severity = severity;
    if (status) whereCondition.status = status;

    if (dateFrom && dateTo) {
        whereCondition.createdAt = {
            [Op.between]: [`${dateFrom} 00:00:00`, `${dateTo} 23:59:59`]
        };
    }

    const limit = 20;
    const offset = limit * (+pageNumber - 1);

    const { count, rows: frontendErrors } = await FrontendError.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
            { model: Company, as: "company", attributes: ["id", "name"] },
            { model: User, as: "user", attributes: ["id", "name"] }
        ]
    });

    const hasMore = count > offset + frontendErrors.length;

    return {
        frontendErrors,
        count,
        hasMore
    };
};

export default ListFrontendErrorsService;
