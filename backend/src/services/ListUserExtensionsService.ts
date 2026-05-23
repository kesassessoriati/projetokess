import SipExtension from "../models/SipExtension";

interface UserExtension {
  id: number;
  extension: string;
  authUser: string;
  displayName: string;
  canMakeOutbound: boolean;
  canReceiveInbound: boolean;
  autoRegister: boolean;
}

const ListUserExtensionsService = async (companyId: number, userId: number): Promise<UserExtension[]> => {
  const extensions = await SipExtension.findAll({
    where: {
      companyId,
      userId,
      isActive: true
    },
    raw: true
  });

  return extensions.map((e) => ({
    id: e.id,
    extension: e.extension,
    authUser: e.authUser,
    displayName: e.displayName,
    canMakeOutbound: e.canMakeOutbound,
    canReceiveInbound: e.canReceiveInbound,
    autoRegister: e.autoRegister
  }));
};

export default ListUserExtensionsService;