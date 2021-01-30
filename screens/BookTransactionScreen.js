import React from 'react';
import { Text, View, KeyboardAvoidingView, TouchableOpacity , StyleSheet, ToastAndroid,
Image, TextInput, Alert } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import firebase from 'firebase';
import db from '../Config'
import { add } from 'react-native-reanimated';

export default class TransactionScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      hasCameraPermissions: null,
      scanned: false,
      scannedData: '',
      buttonState: 'normal',
      scannedStudentId: "",
      scannedBookId: "",
      transactionMessage: "",
    }
  }

  getCameraPermissions = async (id) => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" is true when user has granted permission
        status === "granted" is false when user has not granted the permission
      */
      hasCameraPermissions: status === "granted",
      buttonState: id,
      scanned: false
    });
  }

  handleBarCodeScanned = async ({ type, data }) => {
    const {buttonState}= this.state;

    if (buttonState === "BookId") {
      this.setState({
        scanned: true,
        scannedBookId:data,
        buttonState: 'normal'
      });
    }
    else if (buttonState === "StudentId") {
      this.setState({
        scanned: true,
        scannedStudentId: data,
        buttonState: 'normal'
      });

    }

  }

  initilzeBookIssue = async ()=>{
    //Add Transaction
    db.collection('Transaction').add({
      'StudentID': this.state.scannedStudentId,
      "BookId": this.state.scannedBookId,
      'date': firebase.firestore.Timestamp.now().toDate(),
      'TransactionType':'Issued',
    })
    //Change Book Statics
    db.collection('Books').doc(this.state.scannedBookId).update({
      'BookAvailablity': false,
    })
    //Change Amount Of Books Issued For the Student
    db.collection('Student').doc(this.state.scannedBookId).update({
      'NumBookIssued':firebase.firestore.FieldValue.increment(1)
    })
    Alert.alert('Book Issued')
    this.setState({
      scannedStudentId:'',
      scannedBookId:''
    })
  }

  initilzeBookReturn = async ()=>{
    //Add Transaction
    db.collection('Transaction').add({
      'StudentID': this.state.scannedStudentId,
      "BookId": this.state.scannedBookId,
      'date': firebase.firestore.Timestamp.now().toDate(),
      'TransactionType': 'Returned',
    })
    //Change Book Statics
    db.collection('Books').doc(this.state.scannedBookId).update({
      'BookAvailablity': true,
    })
    //Change Amount Of Books Issued For the Student
    db.collection('Student').doc(this.state.scannedBookId).update({
      'NumBookIssued':firebase.firestore.FieldValue.increment(-1)
    })
    Alert.alert('Book Returned')
    this.setState({
      scannedStudentId:'',
      scannedBookId:''
    })
  }

  checkBookEligiblity = async ()=>{
    const bookRef =await db.collection('Books').where('BookId','==',this.state.scannedBookId).get()
    var TransactionType='';
    if (bookRef.docs.length == 0){
      TransactionType=false
    }else{
      bookRef.docs.map(doc=>{
        var book = doc.data()
        if (book.BookAvailablity){
          TransactionType='Issue'
        }else(
          TransactionType='Return'
        )
      })
    }
    return TransactionType

  }

  checkStudentEligiblityForBookIssue = async ()=>{
    const studentRef =await db.collection('Students').where('StudentID','==',this.state.scannedStudentId).get()
    var isStudentEligible='';
    if (studentRef.docs.length == 0){
      this.setState({
        scannedStudentId:'',
        scannedBookId:'',
      })
      isStudentEligible=false
      Alert.alert('This Id does not exist with in our database. Please try again or contact an admin.')
    }else{
      studentRef.docs.map(doc=>{
        var student=doc.data()
        if (student.NumBookIssued <2){
          isStudentEligible=true
          Alert.alert('One moment your request is being prossesed.')
        }else{
          StudnetEligible=false
          Alert.alert('You have reached the maximum amount of books that can be issued.')
        }
        this.setState({
          scannedBookId:'',
          scannedStudentId:''
        })
      })
    }
    return isStudentEligible
  }

  checkStudentEligiblityForBookReturn = async ()=>{
    const TransactionRef = await db.collection('Transaction').where('BookId','==',this.state.scannedBookId).get;
    var isStudentEligible='';
    TransactionRef.docs.map(doc=>{
      var lastTransaction = doc.data()
      if(lastTransaction.StudentID===this.state.scannedStudentId){
        isStudentEligible=true
      }
      else{
        isStudentEligible=false
        Alert.alert('This book was not issued to you.Please have the student who checked out the book return it.')
        this.setState({
          scannedStudentId:'',
          scannedBookId:''
        })
      }
    })
    return isStudentEligible
  }

  handleTransaction = async ()=>{
    var transactionMessage

    db.collection('Books').doc(this.state.scannedBookId).get()
    .then ((doc) =>{
      var Availablity=doc.data()
      if(Availablity.BookAvailablity){
        this.initilzeBookIssue();
        transactionMessage= 'Book Issued'
        Alert.alert(transactionMessage)
        //ToastAndroid.show(transactionMessage,ToastAndroid.SHORT)
      }else{
        this.initilzeBookReturn();
        transactionMessage= 'Book Returned'
        Alert.alert(transactionMessage)
        //ToastAndroid.show(transactionMessage,ToastAndroid.SHORT)
      }
      this.setState({transactionMessage: transactionMessage})
    })   
    
    /*Handle Transaction is going to verify if the student is eligible for the issuing 
    of a book. IF the student Id is present with in the database we will isse teh book uless they reached the maximum number of books that can be issued.
    The maximum number of books that can be issued is 2, if they already reached the limimt the book will not be issued.
    We are goign to cheak the student Id that checked out the book and the student Id returneing it. IF they do not match they will be denined.
    */ 

    var TransactionType = await this.checkBookEligiblity();

    if (!TransactionType){
      Alert.alert('This book does not exist with in this database.')

      this.setState({
        scannedStudentId:'',
        scannedBookId:''
      })
    }else if(TransactionType==='Issued'){
      var isStudentEligible= await this.checkStudentEligiblityForBookIssue()
      if(StudnetEligible){
        this.initilzeBookIssue();
        Alert.alert('Your Book was issued.');
      }
    }else{
      var isStudentEligible= await this.checkStudentEligiblityForBookReturn()
      if(StudnetEligible){
        this.initilzeBookIssue();
        Alert.alert('Your Book was returned to the Libary.Do come again.');
      }
    }
  }


  render() {
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;
  

    if (buttonState !== "normal" && hasCameraPermissions) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }

    else if (buttonState === "normal") {
      return (
        <KeyboardAvoidingView
        style={styles.container}
        behavior='padding'
        enabled
        >
        <View style={styles.container}>
          <View>
            <Image source={require("../assets/booklogo.jpg")}
              style={{ width: 200, height: 200 }}>
            </Image>
            <Text style={{textAlign: 'center', fontSize: 30}}>Wily</Text>
          </View>


          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder={"Book Id"}
              onChangeText={(text)=>{
                this.setState({
                  scannedBookId:text
                })
              }}
              value={this.state.scannedBookId}>
            </TextInput>
            
            <TouchableOpacity style={styles.scanbutton}
              onPress={() => {
                this.getCameraPermissions("BookId")
              }}>
              <Text style={styles.buttonText}> Scan </Text>
            </TouchableOpacity>
          </View>


          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder={"Student Id"}
              onChangeText={(text)=>{
                this.setState({
                  scannedStudentId:text
                })
              }}
              value={this.state.scannedStudentId}>

            </TextInput>
            <TouchableOpacity style={styles.scanbutton}
            onPress={() => {
              this.getCameraPermissions("StudentId")
            }}>
              <Text style={styles.buttonText}
                > Scan </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={()=> {var transactionMessage =this.handleTransaction()
          this.setState({
            scannedStudentId:'',
            scannedBookId:''
          })}}>

              <Text styles={styles.submitButtonText}>
                Submit
              </Text>
            </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:"lightyellow"
  },
  displayText: {
    fontSize: 15,
    textDecorationLine: 'underline'
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    margin: 10
  },
  inputView: {
    flexDirection: "row",
    margin: 20
  },
  inputBox: {
    width: 200,
    height: 40,
    borderWidth: 1.5,
    borderRightWidth: 0,
    fontSize: 20,
  },
  buttonText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 10
  },
  scanbutton: {
    backgroundColor: "blue", width: 50, borderWidth: 1.5, borderLeftWidth: 0
  },
  submitButton: {
    backgroundColor: 'cyan',
    width: 100,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  submitButtonText: {
    textAlign: 'center',
    alignSelf: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    padding: 10
  }
});