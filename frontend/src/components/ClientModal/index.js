import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  makeStyles,
  CircularProgress,
  Typography,
  Divider
} from "@material-ui/core";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const filter = createFilterOptions();

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    fontWeight: 600
  },
  formField: {
    marginBottom: theme.spacing(2)
  },
  dialogActions: {
    justifyContent: "space-between",
    padding: theme.spacing(2, 3)
  },
  sectionTitle: {
    fontWeight: 600,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    width: "100%",
    color: theme.palette.primary.main
  }
}));

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "blocked", label: "Bloqueado" }
];

const TYPE_OPTIONS = [
  { value: "pf", label: "Pessoa Física" },
  { value: "pj", label: "Pessoa Jurídica" }
];

const defaultForm = {
  type: "pf",
  name: "",
  companyName: "",
  document: "",
  birthDate: "",
  email: "",
  phone: "",
  decisorName: "",
  decisorPhone: "",
  site: "",
  instagram: "",
  linkedin: "",
  cargo: "",
  origem: "",
  campanhaTag: "",
  temperatura: "",
  score: 0,
  tags: "",
  acquiredProduct: "",
  acquisitionDate: "",
  zipCode: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  status: "active",
  clientSince: "",
  expirationDate: "",
  ownerUserId: "",
  notes: ""
};

const ClientModal = ({ open, onClose, clientId, onSuccess }) => {
  const classes = useStyles();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [{ data: usersData }, { data: productsData }] = await Promise.all([
          api.get("/users/"),
          api.get("/produtos", { params: { limit: 100 } })
        ]);
        setUsers(usersData.users || []);
        setProducts(Array.isArray(productsData?.produtos) ? productsData.produtos : (Array.isArray(productsData) ? productsData : []));
      } catch (err) {
        toastError(err);
      }
    };

    fetchData();

    if (clientId) {
      loadClient();
    } else {
      setForm(defaultForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, open]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/crm/clients/${clientId}`);
      setForm({
        type: data.type || "pf",
        name: data.name || "",
        companyName: data.companyName || "",
        document: data.document || "",
        birthDate: data.birthDate ? data.birthDate.substring(0, 10) : "",
        email: data.email || "",
        phone: data.phone || "",
        decisorName: data.decisorName || "",
        decisorPhone: data.decisorPhone || "",
        site: data.site || "",
        instagram: data.instagram || "",
        linkedin: data.linkedin || "",
        cargo: data.cargo || "",
        origem: data.origem || "",
        campanhaTag: data.campanhaTag || "",
        temperatura: data.temperatura || "",
        score: data.score || 0,
        tags: data.tags || "",
        acquiredProduct: data.acquiredProduct || "",
        acquisitionDate: data.acquisitionDate ? data.acquisitionDate.substring(0, 10) : "",
        zipCode: data.zipCode || "",
        address: data.address || "",
        number: data.number || "",
        complement: data.complement || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || "",
        status: data.status || "active",
        clientSince: data.clientSince ? data.clientSince.substring(0, 10) : "",
        expirationDate: data.expirationDate ? data.expirationDate.substring(0, 10) : "",
        ownerUserId: data.ownerUserId || "",
        notes: data.notes || ""
      });
    } catch (err) {
      toastError(err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (!form.name.trim()) {
        toast.error("O nome é obrigatório.");
        setSubmitting(false);
        return;
      }

      const payload = {
        ...form,
        ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : undefined,
        birthDate: form.birthDate || undefined,
        clientSince: form.clientSince || undefined,
        acquisitionDate: form.acquisitionDate || null,
        expirationDate: form.expirationDate || null
      };

      if (clientId) {
        await api.put(`/crm/clients/${clientId}`, payload);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await api.post("/crm/clients", payload);
        toast.success("Cliente criado com sucesso!");
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        {clientId ? "Editar Cliente" : "Novo Cliente"}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Grid container justifyContent="center">
            <CircularProgress size={24} />
          </Grid>
        ) : (
          <form onSubmit={handleSubmit} id="client-form">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Dados básicos
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Tipo"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Nome"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  required
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Empresa"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Documento"
                  name="document"
                  value={form.document}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  variant="outlined"
                  type="email"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Informações comerciais
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cargo"
                  name="cargo"
                  value={form.cargo}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Nome do decisor"
                  name="decisorName"
                  value={form.decisorName}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Telefone do decisor"
                  name="decisorPhone"
                  value={form.decisorPhone}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Presença digital
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Site"
                  name="site"
                  value={form.site}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Instagram"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="LinkedIn"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  CRM
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Origem"
                  name="origem"
                  value={form.origem}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Campanha / Tag"
                  name="campanhaTag"
                  value={form.campanhaTag}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Temperatura"
                  name="temperatura"
                  value={form.temperatura}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Score"
                  name="score"
                  type="number"
                  value={form.score}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Tags"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={products}
                  value={form.acquiredProduct || ""}
                  onChange={(event, newValue) => {
                    const productName =
                      typeof newValue === "string"
                        ? newValue
                        : newValue?.inputValue || newValue?.nome || "";
                    setForm((prev) => ({ ...prev, acquiredProduct: productName }));
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason === "input") {
                      setForm((prev) => ({ ...prev, acquiredProduct: newInputValue }));
                    }
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") return option;
                    return option?.inputValue || option?.nome || "";
                  }}
                  filterOptions={(options, params) => {
                    const filtered = filter(options, params);
                    const inputValue = params.inputValue.trim();
                    if (
                      inputValue &&
                      !options.some((o) => (o?.nome || "").toLowerCase() === inputValue.toLowerCase())
                    ) {
                      filtered.push({ inputValue, nome: `Usar "${inputValue}"` });
                    }
                    return filtered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Produto adquirido"
                      variant="outlined"
                      fullWidth
                      className={classes.formField}
                      placeholder="Selecione ou digite um produto"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Responsável"
                  name="ownerUserId"
                  value={form.ownerUserId}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  <MenuItem value="">Sem responsável</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Data de nascimento"
                  name="birthDate"
                  value={form.birthDate}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cliente desde"
                  name="clientSince"
                  value={form.clientSince}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Data de aquisição"
                  name="acquisitionDate"
                  value={form.acquisitionDate}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  helperText="Quando o cliente adquiriu o produto/plano."
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Data de vencimento"
                  name="expirationDate"
                  value={form.expirationDate}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  helperText="Ao atingir a data, o cliente será marcado como inativo."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Observações"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  multiline
                  rows={3}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Endereço
                </Typography>
                <Divider />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="CEP"
                  name="zipCode"
                  value={form.zipCode}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Número"
                  name="number"
                  value={form.number}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Endereço"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Complemento"
                  name="complement"
                  value={form.complement}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Bairro"
                  name="neighborhood"
                  value={form.neighborhood}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cidade"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="UF"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  className={classes.formField}
                  inputProps={{ maxLength: 2 }}
                />
              </Grid>
            </Grid>
          </form>
        )}
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          color="primary"
          variant="contained"
          form="client-form"
          disabled={submitting || loading}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientModal;
