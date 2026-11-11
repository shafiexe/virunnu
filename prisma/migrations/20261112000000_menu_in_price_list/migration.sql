-- AlterTable
ALTER TABLE "CatererItem" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isSpecial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVeg" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showOnPublic" BOOLEAN NOT NULL DEFAULT false;


-- The public menu now lives in the price list: carry every existing menu item over, shown on the public page.
-- A dish that is already in the price list under the same name keeps its rate and just gets the public details.
INSERT INTO "CatererItem" ("id", "catererId", "name", "group", "unit", "ratePaise", "active", "sortOrder", "showOnPublic", "category", "description", "isVeg", "isSpecial", "createdAt")
SELECT 'mi_' || m."id", m."catererId", m."name", 'FOOD', 'plate', m."priceRupees" * 100, true, 0, true, m."category", m."description", m."isVeg", m."isSpecial", m."createdAt"
FROM "MenuItem" m
ON CONFLICT ("catererId", "name") DO UPDATE SET
  "showOnPublic" = true, "category" = EXCLUDED."category", "description" = EXCLUDED."description", "isVeg" = EXCLUDED."isVeg", "isSpecial" = EXCLUDED."isSpecial";
