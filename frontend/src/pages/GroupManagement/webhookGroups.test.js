import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Chip from "@material-ui/core/Chip";

import {
  normalizeSelectedGroups,
  resolveGroupLabel,
  removeGroupFromSelection
} from "./webhookGroups";

/**
 * Bug A — Webhook de grupos exibia "NaN NaN NaN".
 *
 * Causa-raiz: o <Select> usava `group.id` (JID string "...@g.us") como value
 * e aplicava `.map(Number)` em selectedGroups -> NaN. O identificador correto
 * é `group.groupId` (inteiro, GroupDirectory.id).
 */

const GROUP_JID = "120363000000000000@g.us";

// Espelha a forma real de cada item vindo de /group-management/groups
const groups = [
  { id: "111@g.us", groupId: 42, subject: "Grupo Vendas", groupJid: "111@g.us" },
  { id: "222@g.us", groupId: 7, subject: "Grupo Suporte", groupJid: "222@g.us" },
  { id: GROUP_JID, groupId: 99, subject: "", groupJid: GROUP_JID } // sem subject
];

describe("normalizeSelectedGroups", () => {
  it("mantém ids numéricos como inteiros", () => {
    expect(normalizeSelectedGroups([42, 7])).toEqual([42, 7]);
  });

  it("converte strings numéricas em inteiros", () => {
    expect(normalizeSelectedGroups(["42", "7"])).toEqual([42, 7]);
  });

  it("descarta JIDs que virariam NaN", () => {
    expect(normalizeSelectedGroups([GROUP_JID, "a@g.us", 42])).toEqual([42]);
  });

  it("retorna [] para entrada inválida", () => {
    expect(normalizeSelectedGroups(undefined)).toEqual([]);
    expect(normalizeSelectedGroups(null)).toEqual([]);
  });
});

describe("resolveGroupLabel", () => {
  it("resolve o subject pelo groupId numérico", () => {
    expect(resolveGroupLabel(42, groups)).toBe("Grupo Vendas");
    expect(resolveGroupLabel("7", groups)).toBe("Grupo Suporte");
  });

  it("cai para groupJid quando não há subject", () => {
    expect(resolveGroupLabel(99, groups)).toBe(GROUP_JID);
  });

  it("NUNCA retorna 'NaN' quando o grupo não está no diretório", () => {
    const label = resolveGroupLabel(12345, groups);
    expect(label).toBe("#12345");
    expect(label).not.toContain("NaN");
  });

  it("regressão: um id inválido (JID) não produz 'NaN' no rótulo", () => {
    const label = resolveGroupLabel(GROUP_JID, groups);
    expect(label).not.toContain("NaN");
  });
});

describe("removeGroupFromSelection", () => {
  it("remove o grupo informado mantendo os demais", () => {
    expect(removeGroupFromSelection([42, 7, 99], 7)).toEqual([42, 99]);
  });

  it("aceita id como string e ainda remove", () => {
    expect(removeGroupFromSelection([42, 7], "42")).toEqual([7]);
  });
});

describe("render dos chips de grupos monitorados (Material-UI v4)", () => {
  // Componente mínimo que reproduz o bloco do renderValue / lista por webhook,
  // usando os helpers corrigidos.
  const MonitoredGroupsChips = ({ selected, groups, onRemove }) => (
    <div>
      {normalizeSelectedGroups(selected).map((id) => (
        <Chip
          key={id}
          size="small"
          label={resolveGroupLabel(id, groups)}
          onDelete={onRemove ? () => onRemove(id) : undefined}
        />
      ))}
    </div>
  );

  it("exibe os nomes dos grupos e nunca 'NaN'", () => {
    render(<MonitoredGroupsChips selected={[42, 7]} groups={groups} />);

    expect(screen.getByText("Grupo Vendas")).toBeInTheDocument();
    expect(screen.getByText("Grupo Suporte")).toBeInTheDocument();
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it("regressão: estado quebrado (JIDs) não renderiza chips 'NaN'", () => {
    const brokenSelected = [Number(GROUP_JID), Number("x@g.us")]; // [NaN, NaN]
    const { container } = render(
      <MonitoredGroupsChips selected={brokenSelected} groups={groups} />
    );

    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".MuiChip-root")).toHaveLength(0);
  });

  it("mostra '#id' quando o grupo não está mais no diretório", () => {
    render(<MonitoredGroupsChips selected={[12345]} groups={groups} />);
    expect(screen.getByText("#12345")).toBeInTheDocument();
  });

  it("chama onRemove com o id correto ao clicar no delete do chip", () => {
    const onRemove = jest.fn();
    render(
      <MonitoredGroupsChips selected={[42]} groups={groups} onRemove={onRemove} />
    );

    const deleteIcon = document.querySelector(".MuiChip-deleteIcon");
    expect(deleteIcon).toBeTruthy();
    fireEvent.click(deleteIcon);

    expect(onRemove).toHaveBeenCalledWith(42);
  });
});
