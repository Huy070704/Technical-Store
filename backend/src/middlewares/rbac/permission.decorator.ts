import { HttpException } from "@/shared/exceptions/http-exceptions";
import { defineAbilityFor, Actions } from "./ability.factory";
import { ForbiddenError } from "@casl/ability";

export function CheckAbility(action: Actions, subject: any) {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args.find(
        (arg) => arg && typeof arg === "object" && "user" in arg
      );

      if (!req || !req.user) {
        throw new HttpException(401, "Unauthorized");
      }

      const user = req.user;

      if (!user.role?.name) {
        throw new HttpException(403, "Forbidden: role not found");
      }

      const ability = defineAbilityFor(user.role.name, user);

      let subjectInstance = args.find(
        (arg) => arg && arg.constructor === subject
      );
      if (!subjectInstance) subjectInstance = subject;

      try {
        ForbiddenError.from(ability).throwUnlessCan(action, subjectInstance);
      } catch (err) {
        if (err instanceof ForbiddenError) {
          throw new HttpException(403, "Bạn không có quyền thực hiện hành động này.");
        }
        throw err;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
