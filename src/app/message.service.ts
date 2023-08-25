import { ElementRef, Injectable, ViewChild, ViewChildren } from '@angular/core';
declare var SockJS;
declare var Stomp;
import {environment} from '../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ResponseEntity } from './retorno';
import { Message } from './message';
import { MessagesListResponse } from './messages';

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  public stompClient;
  private ticket: String = null;
  private username : String = "Support";
  public messages : Message[] = []

  apiURL: string = 'http://localhost:8082/get/message';

  @ViewChildren('scroll')
  scroll: ElementRef


  constructor(private http: HttpClient) {
   
  }

  sendMessage(message: String) {
    let msg = new Message(this.ticket, this.username, message);
    console.log("SEND: "+msg.ticket);
    this.stompClient.send('/app/message/send' , {}, JSON.stringify(msg));
  }

  ngOnInit(): void {}

  connectApi(ticket) {
    if (ticket) {
      this.ticket = ticket;
      this.initializeWebSocketConnection();
    } 
  }

  initializeWebSocketConnection() {
    if (this.ticket) {
      this.getMessages();
      const serverUrl = environment.app_socket_url;
      const ws = new SockJS(serverUrl);
      this.stompClient = Stomp.over(ws);
      const that = this;
      this.stompClient.connect({}, function(frame) {
        that.listener(that);
      }, errorCallback => {
        this.stompClient.unsubscribe();
        this.stompClient.disconnect();
        this.stompClient = null;
        ws.close(1000, "Work complete");
        console.log("TERMINATE: ");
        console.log("ERRO: ");
      });
      
    }
  }

  private listener(that) {

    that.stompClient.subscribe('/message/queue/'+that.ticket, (message) => {
      if (message.body) {
        let response = JSON.parse(message.body);
        that.messages.push(new Message(response.ticket, response.username, response.message));
      }  
    });
  }

  getMessages() {
    this.messages = [];
    this.getMessagesObservable().subscribe((response) =>{
      if(response.messages) {
        response.messages.forEach((msg:Message) => {  
          msg.message = msg.message.split("\\n").join("\n");
        });  
        this.messages = this.messages.concat(this.messages, response.messages);
      }
    });
  }

  getMessagesObservable(): Observable<MessagesListResponse> {
    const serverUrl = environment.app_rest_url;
    const headers = {
          headers: new HttpHeaders({
            'Content-Type':  'application/json'
          })
        }

    return this.http.get<MessagesListResponse>(serverUrl+'/message/backup/'+this.ticket, headers);
  }

  openConnection(message: Message): Observable<Message> {
    const serverUrl = environment.app_rest_url;
    const headers = {
          headers: new HttpHeaders({
            'Content-Type':  'application/json'
          })
        }

    return this.http.post<Message>(serverUrl+'/handshake', JSON.stringify(message), headers);
  }


  isUser(username: String) : boolean {
    return this.username == username;
  }


}
