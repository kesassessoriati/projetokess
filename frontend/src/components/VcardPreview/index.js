import React, { useEffect, useState, useContext } from 'react';
import { useHistory } from "react-router-dom";
import api from "../../services/api";

import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";

import { AuthContext } from "../../context/Auth/AuthContext";

import { Button, Divider, useTheme, } from "@material-ui/core";
import { isNil } from 'lodash';
import ShowTicketOpen from '../ShowTicketOpenModal';
import { grey } from '@material-ui/core/colors';

const VcardPreview = ({ contact, numbers, queueId, whatsappId }) => {
    const theme = useTheme();
    const history = useHistory();
    const { user } = useContext(AuthContext);

    const companyId = user.companyId;

    const [openAlert, setOpenAlert] = useState(false);
    const [userTicketOpen, setUserTicketOpen] = useState("");
    const [queueTicketOpen, setQueueTicketOpen] = useState("");

    const [selectedContact, setContact] = useState({
        id: 0,
        name: contact || "",
        number: numbers || "",
        profilePicUrl: "",
        urlPicture: ""
    });

    useEffect(() => {
        setContact(prevState => ({
            ...prevState,
            name: prevState.name || contact || "",
            number: prevState.number || numbers || ""
        }));
    }, [contact, numbers]);

    // useEffect(() => {
    //     const delayDebounceFn = setTimeout(() => {
    //         const fetchContacts = async () => {
    //             try {
    //                 const number = numbers.replace(/\D/g, "");
    //                 const { data } = await api.get(`/contacts/profile/${number}`);

    //                 let obj = {
    //                     id: data.contactId,
    //                     name: contact,
    //                     number: numbers,
    //                     profilePicUrl: data.profilePicUrl
    //                 }

    //                 setContact(obj)

    //             } catch (err) {
    //                 console.log(err)
    //                 toastError(err);
    //             }
    //         };
    //         fetchContacts();
    //     }, 500);
    //     return () => clearTimeout(delayDebounceFn);
    // }, [contact, numbers]);


    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const fetchContacts = async () => {
                try {
                    if (isNil(numbers)) {
                        return
                    }
                    const number = String(numbers || "").replace(/\D/g, "");

                    if (!number) {
                        return;
                    }
                    
                    const getData = await api.get(`/contacts/profile/${number}`);

                    if (getData.data.contactId && getData.data.contactId !== 0) {
                        let obj = {
                            id: getData.data.contactId,
                            name: contact || getData.data.name || "",
                            number: numbers || number,
                            profilePicUrl: getData.data.urlPicture,
                            urlPicture: getData.data.urlPicture
                        }

                        setContact(obj)
                  
                    } else {
                        let contactObj = {
                            name: contact || "Contato compartilhado",
                            number: number,
                            email: "",
                            companyId: companyId
                        }

                        const { data } = await api.post("/contacts", contactObj);
                        setContact(prevState => ({
                            ...prevState,
                            ...data,
                            name: data.name || contactObj.name,
                            number: data.number || number
                        }))
                    }
            
                } catch (err) {
                    console.log(err)
                }
            };
            fetchContacts();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [companyId, contact, numbers]);

    const handleCloseAlert = () => {
        setOpenAlert(false);
        setOpenAlert(false);
        setUserTicketOpen("");
        setQueueTicketOpen("");
    };

    const previewName = selectedContact.name || contact || "Contato compartilhado";
    const previewNumber = String(selectedContact.number || numbers || "").trim();
    const previewAvatar = selectedContact.urlPicture || selectedContact.profilePicUrl || "";

    const handleNewChat = async () => {
        try {
            const { data: ticket } = await api.post("/tickets", {
                contactId: selectedContact.id,
                userId: user.id,
                status: "open",
                queueId,
                companyId: companyId,
                whatsappId
            });

            history.push(`/tickets/${ticket.uuid}`);
        } catch (err) {
            const ticket = JSON.parse(err.response.data.error);

            if (ticket.userId !== user?.id) {
                setOpenAlert(true);
                setUserTicketOpen(ticket.user?.name || "Sem usuário");
                setQueueTicketOpen(ticket.queue?.name || "Sem fila");
            } else {
                setOpenAlert(false);
                setUserTicketOpen("");
                setQueueTicketOpen("");

                history.push(`/tickets/${ticket.uuid}`);
            }
        }
    }

    return (
        <>
            <div style={{
                minWidth: "250px",
            }}>
                <ShowTicketOpen
                    isOpen={openAlert}
                    handleClose={handleCloseAlert}
                    user={userTicketOpen}
                    queue={queueTicketOpen}
                />
                <Grid container spacing={1}>
                    <Grid item xs={2}>
                        <Avatar src={previewAvatar}>{previewName?.charAt(0)?.toUpperCase() || "C"}</Avatar>
                    </Grid>
                    <Grid item xs={9}>
                        <Typography
                            style={{ marginTop: "12px", marginLeft: "10px" }}
                            color="primary"
                            variant="subtitle1"
                            gutterBottom
                        >
                            {previewName}
                        </Typography>
                        {!!previewNumber && (
                            <Typography
                                style={{ marginTop: "-10px", marginLeft: "10px", color: grey[700] }}
                                variant="body2"
                                gutterBottom
                            >
                                {previewNumber}
                            </Typography>
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <Divider />
                        <Button
                            fullWidth
                            color="primary"
                            onClick={handleNewChat}
                            disabled={!previewNumber || !selectedContact.id}
                        >Conversar</Button>
                    </Grid>
                </Grid>
            </div>
        </>
    );

};

export default VcardPreview;
