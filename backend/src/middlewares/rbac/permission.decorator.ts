import { ForbiddenException } from "@/exceptions/http-exceptions";
import { defineAbilityFor, Actions } from "./ability.factory";
import { ForbiddenError } from "@casl/ability";

export function CheckAbility(action: Actions, subject: any) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const req = args.find(
        (arg) => arg && typeof arg === "object" && "user" in arg
      );
      if (!req || !req.user) throw new Error("User not found in request");
      const user = req.user;
      const ability = defineAbilityFor(user.role.name, user);

      let subjectInstance = args.find(
        (arg) => arg && arg.constructor === subject
      );
      if (!subjectInstance) subjectInstance = subject;

      try {
        ForbiddenError.from(ability).throwUnlessCan(action, subjectInstance);
      } catch (err) {
        if (err instanceof ForbiddenError) {
          throw new ForbiddenException("You do not have permission to perform this action.");
        }
        throw err;
      }

      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}
