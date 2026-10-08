"use client";

import { IconEdit, IconHelp, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

export function LayersDemo() {
  const t = useTranslations("catalog");
  const notify = useToast();
  const showToast = () =>
    notify({ title: t("toast.title"), description: t("toast.description"), tone: "success" });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">{t("layers.dialog")}</Button>
        </DialogTrigger>
        <DialogContent title={t("layers.dialogTitle")} description={t("layers.dialogBody")}>
          <DialogActions>
            <DialogClose asChild>
              <Button variant="secondary">{t("layers.cancel")}</Button>
            </DialogClose>
            <Button onClick={showToast}>{t("layers.toast")}</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        trigger={<Button variant="danger">{t("layers.confirm")}</Button>}
        title={t("layers.confirmTitle")}
        consequence={t("layers.confirmBody")}
        confirmLabel={t("layers.confirmAction")}
        cancelLabel={t("layers.cancel")}
        onConfirm={showToast}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary">{t("layers.popover")}</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-body-small">{t("layers.popoverBody")}</p>
        </PopoverContent>
      </Popover>

      <Tooltip label={t("layers.tooltip")}>
        <Button
          variant="secondary"
          aria-label={t("layers.help")}
          icon={<IconHelp className="size-5" aria-hidden="true" />}
        />
      </Tooltip>

      <Menu trigger={<Button variant="secondary">{t("layers.menu")}</Button>}>
        <MenuItem icon={<IconEdit className="size-5" aria-hidden="true" />}>
          {t("layers.menuEdit")}
        </MenuItem>
        <MenuItem>{t("layers.menuArchive")}</MenuItem>
        <MenuSeparator />
        <MenuItem destructive icon={<IconTrash className="size-5" aria-hidden="true" />}>
          {t("layers.menuDelete")}
        </MenuItem>
      </Menu>

      <Button variant="secondary" onClick={showToast}>
        {t("layers.toast")}
      </Button>
    </div>
  );
}
