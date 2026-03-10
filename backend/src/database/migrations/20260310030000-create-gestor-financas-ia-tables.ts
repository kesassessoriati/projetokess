import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ── GfProfiles ────────────────────────────────────────────────────────────
    await queryInterface.createTable("GfProfiles", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      organizationName: { type: DataTypes.STRING, allowNull: true },
      telefone: { type: DataTypes.STRING, allowNull: true },
      endereco: { type: DataTypes.TEXT, allowNull: true },
      avatarUrl: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfProfiles", ["companyId"]);

    // ── GfCategorias ─────────────────────────────────────────────────────────
    await queryInterface.createTable("GfCategorias", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      nome: { type: DataTypes.STRING, allowNull: false },
      tipo: { type: DataTypes.ENUM("receita", "despesa"), allowNull: false },
      cor: { type: DataTypes.STRING(20), defaultValue: "#3B82F6" },
      icone: { type: DataTypes.STRING(50), defaultValue: "DollarSign" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfCategorias", ["companyId", "userId"]);
    await queryInterface.addIndex("GfCategorias", ["tipo"]);

    // ── GfReceitas ────────────────────────────────────────────────────────────
    await queryInterface.createTable("GfReceitas", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfCategorias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfReceitas", ["companyId", "userId"]);
    await queryInterface.addIndex("GfReceitas", ["data"]);

    // ── GfDespesas ────────────────────────────────────────────────────────────
    await queryInterface.createTable("GfDespesas", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfCategorias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfDespesas", ["companyId", "userId"]);
    await queryInterface.addIndex("GfDespesas", ["data"]);

    // ── GfTransacoes ──────────────────────────────────────────────────────────
    await queryInterface.createTable("GfTransacoes", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfCategorias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      tipo: { type: DataTypes.ENUM("receita", "despesa"), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfTransacoes", ["companyId", "userId"]);
    await queryInterface.addIndex("GfTransacoes", ["tipo"]);
    await queryInterface.addIndex("GfTransacoes", ["data"]);

    // ── GfDividas ─────────────────────────────────────────────────────────────
    await queryInterface.createTable("GfDividas", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfCategorias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      valorTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      valorPago: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      valorRestante: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      dataVencimento: { type: DataTypes.DATEONLY, allowNull: false },
      parcelas: { type: DataTypes.INTEGER, defaultValue: 1 },
      parcelasPagas: { type: DataTypes.INTEGER, defaultValue: 0 },
      status: { type: DataTypes.ENUM("pendente", "vencida", "quitada"), defaultValue: "pendente" },
      credor: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfDividas", ["companyId", "userId"]);
    await queryInterface.addIndex("GfDividas", ["status"]);
    await queryInterface.addIndex("GfDividas", ["dataVencimento"]);

    // ── GfCategoriasMetas ─────────────────────────────────────────────────────
    await queryInterface.createTable("GfCategoriasMetas", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      nome: { type: DataTypes.STRING, allowNull: false },
      cor: { type: DataTypes.STRING(20), defaultValue: "#10B981" },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      ativa: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfCategoriasMetas", ["companyId", "userId"]);

    // ── GfMetas ───────────────────────────────────────────────────────────────
    await queryInterface.createTable("GfMetas", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaMetaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfCategoriasMetas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      titulo: { type: DataTypes.STRING, allowNull: false },
      tipo: { type: DataTypes.ENUM("economia", "receita", "despesa", "investimento"), allowNull: false },
      valorAlvo: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      valorAtual: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      dataInicio: { type: DataTypes.DATEONLY, allowNull: false },
      dataLimite: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.ENUM("ativa", "concluida", "pausada", "vencida"), defaultValue: "ativa" },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfMetas", ["companyId", "userId"]);
    await queryInterface.addIndex("GfMetas", ["status"]);
    await queryInterface.addIndex("GfMetas", ["dataLimite"]);

    // ── GfCategoriasMercado ───────────────────────────────────────────────────
    await queryInterface.createTable("GfCategoriasMercado", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      nome: { type: DataTypes.STRING, allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      cor: { type: DataTypes.STRING(20), defaultValue: "#10B981" },
      ativa: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfCategoriasMercado", ["companyId", "userId"]);

    // ── GfItensMercado ────────────────────────────────────────────────────────
    await queryInterface.createTable("GfItensMercado", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaMercadoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfCategoriasMercado", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      unidadeMedida: { type: DataTypes.STRING(50), defaultValue: "unidade" },
      quantidadeAtual: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
      quantidadeIdeal: { type: DataTypes.DECIMAL(10, 3), defaultValue: 1 },
      precoAtual: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      status: {
        type: DataTypes.ENUM("estoque_adequado", "estoque_medio", "estoque_baixo", "sem_estoque"),
        defaultValue: "estoque_baixo"
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfItensMercado", ["companyId", "userId"]);
    await queryInterface.addIndex("GfItensMercado", ["status"]);

    // ── GfOrcamentosMercado ───────────────────────────────────────────────────
    await queryInterface.createTable("GfOrcamentosMercado", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoriaDespesa: { type: DataTypes.STRING, defaultValue: "Alimentação" },
      valorOrcamento: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      estimativaGastos: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      mesReferencia: { type: DataTypes.DATEONLY, allowNull: false },
      ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfOrcamentosMercado", ["companyId", "userId"]);
    await queryInterface.addIndex("GfOrcamentosMercado", ["mesReferencia"]);

    // ── GfVeiculos ────────────────────────────────────────────────────────────
    await queryInterface.createTable("GfVeiculos", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      marca: { type: DataTypes.STRING, allowNull: false },
      modelo: { type: DataTypes.STRING, allowNull: false },
      ano: { type: DataTypes.STRING(10), allowNull: false },
      placa: { type: DataTypes.STRING(10), allowNull: true },
      cor: { type: DataTypes.STRING, allowNull: true },
      combustivel: { type: DataTypes.STRING, allowNull: true },
      dataAquisicao: { type: DataTypes.DATEONLY, allowNull: true },
      quilometragem: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfVeiculos", ["companyId", "userId"]);

    // ── GfTiposManutencao ─────────────────────────────────────────────────────
    await queryInterface.createTable("GfTiposManutencao", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      nome: { type: DataTypes.STRING, allowNull: false },
      sistema: { type: DataTypes.STRING, allowNull: false },
      intervaloKm: { type: DataTypes.INTEGER, allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfTiposManutencao", ["companyId", "userId"]);

    // ── GfManutencoes ─────────────────────────────────────────────────────────
    await queryInterface.createTable("GfManutencoes", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      veiculoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "GfVeiculos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      tipoManutencaoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "GfTiposManutencao", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      quilometragemRealizada: { type: DataTypes.INTEGER, allowNull: true },
      dataRealizada: { type: DataTypes.DATEONLY, allowNull: true },
      dataProxima: { type: DataTypes.DATEONLY, allowNull: true },
      quilometragemProxima: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(20), defaultValue: "pendente" },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfManutencoes", ["companyId", "userId"]);
    await queryInterface.addIndex("GfManutencoes", ["veiculoId"]);
    await queryInterface.addIndex("GfManutencoes", ["status"]);

    // ── GfIaConfiguracoes ─────────────────────────────────────────────────────
    await queryInterface.createTable("GfIaConfiguracoes", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      apiKey: { type: DataTypes.TEXT, allowNull: false },
      modelo: { type: DataTypes.STRING, defaultValue: "gpt-4o" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    // ── GfIaUploads ───────────────────────────────────────────────────────────
    await queryInterface.createTable("GfIaUploads", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      fileName: { type: DataTypes.STRING, allowNull: false },
      fileType: { type: DataTypes.STRING(100), allowNull: false },
      fileSize: { type: DataTypes.BIGINT, allowNull: false },
      storagePath: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfIaUploads", ["companyId", "userId"]);

    // ── GfIaAnalysisResults ───────────────────────────────────────────────────
    await queryInterface.createTable("GfIaAnalysisResults", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      uploadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GfIaUploads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      fileName: { type: DataTypes.STRING, allowNull: false },
      tipo: { type: DataTypes.ENUM("receita", "despesa"), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      categoria: { type: DataTypes.STRING, allowNull: false },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      confianca: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("GfIaAnalysisResults", ["companyId", "userId"]);
    await queryInterface.addIndex("GfIaAnalysisResults", ["status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("GfIaAnalysisResults");
    await queryInterface.dropTable("GfIaUploads");
    await queryInterface.dropTable("GfIaConfiguracoes");
    await queryInterface.dropTable("GfManutencoes");
    await queryInterface.dropTable("GfTiposManutencao");
    await queryInterface.dropTable("GfVeiculos");
    await queryInterface.dropTable("GfOrcamentosMercado");
    await queryInterface.dropTable("GfItensMercado");
    await queryInterface.dropTable("GfCategoriasMercado");
    await queryInterface.dropTable("GfMetas");
    await queryInterface.dropTable("GfCategoriasMetas");
    await queryInterface.dropTable("GfDividas");
    await queryInterface.dropTable("GfTransacoes");
    await queryInterface.dropTable("GfDespesas");
    await queryInterface.dropTable("GfReceitas");
    await queryInterface.dropTable("GfCategorias");
    await queryInterface.dropTable("GfProfiles");
  }
};
