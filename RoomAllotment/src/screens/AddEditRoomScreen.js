import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { getDB } from '../utils/db';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AddEditRoomScreen = ({ route, navigation }) => {
  const [room, setRoom] = useState({ floor: '', roomNumber: '', acType: '', totalBeds: '', occupiedBeds: '' });
  const [customFloor, setCustomFloor] = useState('');
  const [customRoom, setCustomRoom] = useState('');
  const edit = route.params?.room;

  const floorRoomMap = {
    'GROUND FLOOR': ['0.01', '0.02', '0.03', '0.04', '0.05'],
    '1ST FLOOR': ['101', '102', '103', '104', '105'],
    '2ND FLOOR': ['201', '202', '203', '204', '205'],
    '3RD FLOOR': ['301', '302', '303', '304', '305', '306', '307'],
    '4TH FLOOR': ['401', '402', '403'],
  };

  const roomNumberOptions = floorRoomMap[room.floor]?.map(r => ({ label: r, value: r })) || [];

  useEffect(() => {
    if (edit) {
      setRoom(edit);
    }
  }, [edit]);

  const saveRoom = () => {
    const db = getDB();
    let { floor, roomNumber, acType, totalBeds, occupiedBeds } = room;

    if (floor === 'Custom Floor') floor = customFloor;
    if (roomNumber === 'Custom Room') roomNumber = customRoom;

    const trimmedFloor = floor?.trim();
    const trimmedRoomNumber = roomNumber?.trim();
    const trimmedAcType = acType?.trim();

    if (!trimmedFloor || trimmedFloor === 'Select Floor') {
      Alert.alert('Error', 'Please select a valid floor');
      return;
    }

    if (!trimmedRoomNumber || trimmedRoomNumber === 'Select Room Number') {
      Alert.alert('Error', 'Please select a valid room number');
      return;
    }

    if (!trimmedAcType || trimmedAcType === 'Select AC Type') {
      Alert.alert('Error', 'Please select a valid AC type');
      return;
    }

    const total = Number(totalBeds);
    const occupied = Number(occupiedBeds);

    if (isNaN(total) || total <= 0) {
      Alert.alert('Error', 'Total beds must be a number greater than 0');
      return;
    }

    if (isNaN(occupied) || occupied < 0 || occupied > total) {
      Alert.alert('Error', 'Occupied beds must be between 0 and total beds');
      return;
    }

    db.transaction(tx => {
      if (edit) {
        tx.executeSql(
          'UPDATE rooms SET floor=?, roomNumber=?, acType=?, totalBeds=?, occupiedBeds=? WHERE id=?',
          [trimmedFloor, trimmedRoomNumber, trimmedAcType, total, occupied, edit.id],
          () => navigation.goBack()
        );
      } else {
        tx.executeSql(
          `SELECT * FROM rooms WHERE floor = ? AND roomNumber = ? AND acType = ?`,
          [trimmedFloor, trimmedRoomNumber, trimmedAcType],
          (_, { rows }) => {
            if (rows.length > 0) {
              Alert.alert('Duplicate Entry', 'Room with same floor, number and type already exists.');
              return;
            }
            tx.executeSql(
              'INSERT INTO rooms (floor, roomNumber, acType, totalBeds, occupiedBeds) VALUES (?, ?, ?, ?, ?)',
              [trimmedFloor, trimmedRoomNumber, trimmedAcType, total, occupied],
              () => navigation.goBack()
            );
          },
          (error) => {
            console.error('Error checking duplicate room:', error);
            Alert.alert('Error', 'Error while checking existing rooms.');
          }
        );
      }
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.dropdown}>
          <Picker
          style={{ color: '#888888' }} 
            selectedValue={room.floor}
            onValueChange={(val) => setRoom({ ...room, floor: val, roomNumber: '' })}>
            <Picker.Item label="Select Floor" value="Select Floor" />
            <Picker.Item label="GROUND FLOOR" value="GROUND FLOOR" />
            <Picker.Item label="1ST FLOOR" value="1ST FLOOR" />
            <Picker.Item label="2ND FLOOR" value="2ND FLOOR" />
            <Picker.Item label="3RD FLOOR" value="3RD FLOOR" />
            <Picker.Item label="4TH FLOOR" value="4TH FLOOR" />
            {!edit && <Picker.Item label="Add Custom Floor" value="Custom Floor" />}
          </Picker>
        </View>

        {!edit && room.floor === 'Custom Floor' && (
          <TextInput
            placeholder="Enter Custom Floor"
            placeholderTextColor="#555"
            value={customFloor}
            onChangeText={setCustomFloor}
            style={[styles.input, styles.customInput]}
          />
        )}

        <View style={styles.dropdown}>
          <Picker
          style={{ color: '#888888' }} 
            selectedValue={room.roomNumber}
            enabled={room.floor !== ''}
            onValueChange={(val) => setRoom({ ...room, roomNumber: val })}>
            <Picker.Item label="Select Room Number" value="Select Room Number" />
            {(floorRoomMap[room.floor] || []).map((r, i) => (
              <Picker.Item label={r} value={r} key={i} />
            ))}
            {!edit && <Picker.Item label="Add Custom Room Number" value="Custom Room" />}
          </Picker>
        </View>

        {!edit && room.roomNumber === 'Custom Room' && (
          <TextInput
            placeholder="Enter Custom Room No"
            placeholderTextColor="#555"
            value={customRoom}
            onChangeText={setCustomRoom}
            style={[styles.input, styles.customInput]}
          />
        )}

        <View style={styles.dropdown}>
          <Picker
          style={{ color: '#888888' }} 
            selectedValue={room.acType}
            onValueChange={(val) => setRoom({ ...room, acType: val })}>
            <Picker.Item label="Select AC Type" value="Select AC Type" />
            <Picker.Item label="AC" value="AC" />
            <Picker.Item label="NON AC" value="NON AC" />
          </Picker>
        </View>

        <TextInput
          placeholder="Total Beds"
          placeholderTextColor="#888888"
          value={room.totalBeds.toString()}
          onChangeText={text => setRoom({ ...room, totalBeds: text })}
          style={styles.input}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Occupied Beds"
          placeholderTextColor="#888888"
          value={room.occupiedBeds.toString()}
          onChangeText={text => setRoom({ ...room, occupiedBeds: text })}
          style={styles.input}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.button} onPress={saveRoom}>
          <Text style={styles.buttonText}>SAVE</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginTop: 30,
  },
  card: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    color: '#000',
  },
  customInput: {
    backgroundColor: '#fffbe6',
    borderColor: '#ffcc00',
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
});

export default AddEditRoomScreen;





// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
// import { getDB } from '../utils/db';
// import DocumentPicker from '@react-native-documents/picker';
// import XLSX from 'xlsx';
// import { Picker } from '@react-native-picker/picker';
// import RNFS from 'react-native-fs';
// import Icon from 'react-native-vector-icons/MaterialIcons';


// const AddEditRoomScreen = ({ route, navigation }) => {
//   const [room, setRoom] = useState({ floor: '', roomNumber: '', acType: '', totalBeds: '', occupiedBeds: '' });
//   const edit = route.params?.room;
//   const [isShowUpload, setIsShowUpload] = useState(true);

//   const floorRoomMap = {
//     'GROUND FLOOR': ['0.01', '0.02', '0.03', '0.04', '0.05'],
//     '1ST FLOOR': ['101', '102', '103', '104', '105'],
//     '2ND FLOOR': ['201', '202', '203', '204', '205'],
//     '3RD FLOOR': ['301', '302', '303', '304', '305', '306', '307'],
//     '4TH FLOOR': ['401', '402', '403'],
//   };


//   const roomNumberOptions = floorRoomMap[room.floor]?.map(r => ({ label: r, value: r })) || [];

//   useEffect(() => {
//     if (edit) {
//       setRoom(edit);
//       setIsShowUpload(false);
//     }
//   }, [edit]);

//   // const saveRoom = () => {
//   //   const db = getDB();
//   //   const { floor, roomNumber, acType, totalBeds, occupiedBeds } = room;
//   //    // Trim and validate dropdowns
//   // if (!floor?.trim() || floor === 'Select Floor') {
//   //   Alert.alert('Error', 'Please select a valid floor');
//   //   return;
//   // }

//   // if (!roomNumber?.trim() || roomNumber === 'Select Room Number') {
//   //   Alert.alert('Error', 'Please select a valid room number');
//   //   return;
//   // }

//   // if (!acType?.trim() || acType === 'Select AC Type') {
//   //   Alert.alert('Error', 'Please select a valid AC type');
//   //   return;
//   // }

//   // // Validate numeric fields
//   // const total = Number(totalBeds);
//   // const occupied = Number(occupiedBeds);

//   // if (isNaN(total) || total <= 0) {
//   //   Alert.alert('Error', 'Total beds must be a number greater than 0');
//   //   return;
//   // }

//   // if (isNaN(occupied) || occupied < 0 || occupied > total) {
//   //   Alert.alert('Error', 'Occupied beds must be between 0 and total beds');
//   //   return;
//   // }

//   //   db.transaction(tx => {
//   //     if (edit) {
//   //       tx.executeSql(
//   //         'UPDATE rooms SET floor=?, roomNumber=?, acType=?, totalBeds=?, occupiedBeds=? WHERE id=?',
//   //         [floor, roomNumber, acType, Number(totalBeds), Number(occupiedBeds), edit.id],
//   //         () => navigation.goBack()
//   //       );
//   //     } else {
//   //       tx.executeSql(
//   //         'INSERT INTO rooms (floor, roomNumber, acType, totalBeds, occupiedBeds) VALUES (?, ?, ?, ?, ?)',
//   //         [floor, roomNumber, acType, Number(totalBeds), Number(occupiedBeds)],
//   //         () => navigation.goBack()
//   //       );
//   //     }
//   //   });
//   // };

// //   const saveRoom = () => {
// //   const db = getDB();
// //   const { floor, roomNumber, acType, totalBeds, occupiedBeds } = room;

// //   // Basic validation (as you already wrote)
// //   if (!floor?.trim() || floor === 'Select Floor') {
// //     Alert.alert('Error', 'Please select a valid floor');
// //     return;
// //   }

// //   if (!roomNumber?.trim() || roomNumber === 'Select Room Number') {
// //     Alert.alert('Error', 'Please select a valid room number');
// //     return;
// //   }

// //   if (!acType?.trim() || acType === 'Select AC Type') {
// //     Alert.alert('Error', 'Please select a valid AC type');
// //     return;
// //   }

// //   const total = Number(totalBeds);
// //   const occupied = Number(occupiedBeds);

// //   if (isNaN(total) || total <= 0) {
// //     Alert.alert('Error', 'Total beds must be a number greater than 0');
// //     return;
// //   }

// //   if (isNaN(occupied) || occupied < 0 || occupied > total) {
// //     Alert.alert('Error', 'Occupied beds must be between 0 and total beds');
// //     return;
// //   }

// //   db.transaction(tx => {
// //     if (edit) {
// //       // ✅ Update existing record
// //       tx.executeSql(
// //         'UPDATE rooms SET floor=?, roomNumber=?, acType=?, totalBeds=?, occupiedBeds=? WHERE id=?',
// //         [floor, roomNumber, acType, total, occupied, edit.id],
// //         () => navigation.goBack()
// //       );
// //     } else {
// //       // ✅ Check for duplicate before insert
// //       tx.executeSql(
// //         `SELECT * FROM rooms WHERE floor = ? AND roomNumber = ? AND acType = ?`,
// //         [floor, roomNumber, acType],
// //         (_, { rows }) => {
// //           if (rows.length > 0) {
// //             Alert.alert('Duplicate Entry', 'A room with this floor, room number, and AC type already exists.');
// //             return;
// //           }

// //           // ✅ Proceed with insert if no duplicate
// //           tx.executeSql(
// //             'INSERT INTO rooms (floor, roomNumber, acType, totalBeds, occupiedBeds) VALUES (?, ?, ?, ?, ?)',
// //             [floor, roomNumber, acType, total, occupied],
// //             () => navigation.goBack()
// //           );
// //         },
// //         (error) => {
// //           console.error('Error checking duplicate room:', error);
// //           Alert.alert('Error', 'Something went wrong while checking existing rooms.');
// //         }
// //       );
// //     }
// //   });
// // };


// const saveRoom = () => {
//   const db = getDB();
//   const { floor, roomNumber, acType, totalBeds, occupiedBeds } = room;

//   // Trimmed values for validation
//   const trimmedFloor = floor?.trim();
//   const trimmedRoomNumber = roomNumber?.trim();
//   const trimmedAcType = acType?.trim();

//   // Dropdown validation
//   if (!trimmedFloor || trimmedFloor === 'Select Floor') {
//     Alert.alert('Error', 'Please select a valid floor');
//     return;
//   }

//   if (!trimmedRoomNumber || trimmedRoomNumber === 'Select Room Number') {
//     Alert.alert('Error', 'Please select a valid room number');
//     return;
//   }

//   if (!trimmedAcType || trimmedAcType === 'Select AC Type') {
//     Alert.alert('Error', 'Please select a valid AC type');
//     return;
//   }

//   // Convert and validate beds
//   const total = Number(totalBeds);
//   const occupied = Number(occupiedBeds);

//   if (isNaN(total) || total <= 0) {
//     Alert.alert('Error', 'Total beds must be a number greater than 0');
//     return;
//   }

//   if (isNaN(occupied)) {
//     Alert.alert('Error', 'Occupied beds must be a valid number');
//     return;
//   }

//   if (occupied < 0) {
//     Alert.alert('Error', 'Occupied beds cannot be negative');
//     return;
//   }

//   if (occupied > total) {
//     Alert.alert('Error', 'Occupied beds cannot exceed total beds');
//     return;
//   }

  

//   db.transaction(tx => {
//     if (edit) {
//       // Update existing room
//       tx.executeSql(
//         'UPDATE rooms SET floor=?, roomNumber=?, acType=?, totalBeds=?, occupiedBeds=? WHERE id=?',
//         [trimmedFloor, trimmedRoomNumber, trimmedAcType, total, occupied, edit.id],
//         () => navigation.goBack()
//       );
//     } else {
//       // Check for duplicate before insert
//       tx.executeSql(
//         `SELECT * FROM rooms WHERE floor = ? AND roomNumber = ? AND acType = ?`,
//         [trimmedFloor, trimmedRoomNumber, trimmedAcType],
//         (_, { rows }) => {
//           if (rows.length > 0) {
//             Alert.alert('Duplicate Entry', 'A room with this floor, room number, and AC type already exists.');
//             return;
//           }

//           // Insert new room
//           tx.executeSql(
//             'INSERT INTO rooms (floor, roomNumber, acType, totalBeds, occupiedBeds) VALUES (?, ?, ?, ?, ?)',
//             [trimmedFloor, trimmedRoomNumber, trimmedAcType, total, occupied],
//             () => navigation.goBack()
//           );
//         },
//         (error) => {
//           console.error('Error checking duplicate room:', error);
//           Alert.alert('Error', 'Something went wrong while checking existing rooms.');
//         }
//       );
//     }
//   });
// };


//   const pickExcelFile = async () => {
//     try {
//       const res = await DocumentPicker.pickSingle({
//         type: [DocumentPicker.types.allFiles],
//       });

//       const filePath = res.uri.replace('file://', '');
//       const fileData = await RNFS.readFile(filePath, 'base64');
//       const workbook = XLSX.read(fileData, { type: 'base64' });

//       const sheetName = workbook.SheetNames[0];
//       const sheet = workbook.Sheets[sheetName];
//       const jsonData = XLSX.utils.sheet_to_json(sheet); // Array of objects

//       saveToSQLite(jsonData);
//     } catch (error) {
//       if (!DocumentPicker.isCancel(error)) {
//         console.error('Error reading file:', error);
//       }
//     }
//   };

//   const saveToSQLite = (data) => {
//     const db = getDB();
//     db.transaction(tx => {
//       data.forEach(row => {
//         const { Floor, RoomNumber, ACType, TotalBeds, OccupiedBeds } = row;

//         if (Floor && RoomNumber) {
//           tx.executeSql(
//             `INSERT INTO rooms (floor, roomNumber, acType, totalBeds, occupiedBeds)
//            VALUES (?, ?, ?, ?, ?)`,
//             [
//               Floor,
//               RoomNumber,
//               ACType || '',
//               Number(TotalBeds) || 0,
//               Number(OccupiedBeds) || 0,
//             ],
//             () => console.log('Inserted:', RoomNumber),
//             (err) => console.log('Insert error:', err)
//           );
//         }
//       });
//     });
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       style={{ flex: 1 }}
//     >
//       <View style={styles.container}>
//         <View style={styles.card}>
//           {/* <TextInput placeholderTextColor="#888888" placeholder="Floor" value={room.floor} onChangeText={text => setRoom({ ...room, floor: text })} style={styles.input} />
//           <TextInput placeholderTextColor="#888888" placeholder="Room Number" value={room.roomNumber} onChangeText={text => setRoom({ ...room, roomNumber: text })} style={styles.input} />
//           <TextInput placeholderTextColor="#888888" placeholder="AC Type (AC/NON AC)" value={room.acType} onChangeText={text => setRoom({ ...room, acType: text })} style={styles.input} /> */}
//           <View style={styles.dropdown}>
//             <Picker
//             style={{ color: '#888888' }} 
//               selectedValue={room.floor}
//               onValueChange={(itemValue) => setRoom({ ...room, floor: itemValue, roomNumber: '' })}
//             >
//               <Picker.Item label="Select Floor" value="Select Floor" />
//               <Picker.Item label="GROUND FLOOR" value="GROUND FLOOR" />
//               <Picker.Item label="1ST FLOOR" value="1ST FLOOR" />
//               <Picker.Item label="2ND FLOOR" value="2ND FLOOR" />
//               <Picker.Item label="3RD FLOOR" value="3RD FLOOR" />
//               <Picker.Item label="4TH FLOOR" value="4TH FLOOR" />
//             </Picker>
//             <Icon name="arrow-drop-down" size={24} color="#000" style={styles.icon} />
//           </View>

//           <View style={styles.dropdown}>
//             <Picker
//             style={{ color: '#888888' }} 
//               selectedValue={room.roomNumber}
//               enabled={room.floor !== ''}
//               onValueChange={(itemValue) => setRoom({ ...room, roomNumber: itemValue })}
//             >
//               <Picker.Item label="Select Room Number" value="Select Room Number" />
//               {(floorRoomMap[room.floor] || []).map((r, i) => (
//                 <Picker.Item label={r} value={r} key={i} />
//               ))}
//             </Picker>
//             <Icon name="arrow-drop-down" size={24} color="#000" style={styles.icon} />
//           </View>

//           <View style={styles.dropdown}>
//             <Picker
//             style={{ color: '#888888' }} 
//               selectedValue={room.acType}
//               onValueChange={(itemValue) => setRoom({ ...room, acType: itemValue })}
//             >
//               <Picker.Item label="Select AC Type" value="Select AC Type" />
//               <Picker.Item label="AC" value="AC" />
//               <Picker.Item label="NON AC" value="NON AC" />
//             </Picker>
//             <Icon name="arrow-drop-down" size={24} color="#000" style={styles.icon} />
//           </View>
//           <TextInput
//           placeholderTextColor="#888888"
//             placeholder="Total Beds"
//             value={room.totalBeds.toString()}
//             onChangeText={text => setRoom({ ...room, totalBeds: text })}
//             style={styles.input}
//             keyboardType="numeric"
//           />
//           <TextInput
//           placeholderTextColor="#888888"
//             placeholder="Occupied Beds"
//             value={room.occupiedBeds.toString()}
//             onChangeText={text => setRoom({ ...room, occupiedBeds: text })}
//             style={styles.input}
//             keyboardType="numeric"
//           />
//           <TouchableOpacity style={styles.button} onPress={saveRoom}>
//             <Text style={styles.buttonText}>SAVE</Text>
//           </TouchableOpacity>
//           {/* {isShowUpload && (
//             <TouchableOpacity style={styles.button} onPress={pickExcelFile} >
//               <Text style={styles.buttonText}>UPLOAD EXCEL</Text>
//             </TouchableOpacity>
//           )
//           } */}
//         </View>
//       </View>
//     </KeyboardAvoidingView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'flex-start',
//     alignItems: 'center',
//     backgroundColor: '#f5f5f5',
//     marginTop: 30
//   },
//   card: {
//     width: '90%',
//     backgroundColor: 'white',
//     borderRadius: 15,
//     padding: 20,
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 5,
//     shadowOffset: { width: 0, height: 2 },
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 12,

//   },
//   button: {
//     backgroundColor: '#4CAF50',
//     borderRadius: 8,
//     paddingVertical: 12,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   buttonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   dropdownContainer: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     marginBottom: 12,
//     paddingHorizontal: 12,
//     backgroundColor: '#fff',
//   },
//   dropdown: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     marginBottom: 12,
//     overflow: 'hidden',
//   },

//   dropdownWrapper: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     paddingRight: 30,
//     marginBottom: 12,
//     position: 'relative',
//     justifyContent: 'center',
//   },
//   picker: {
//     width: '100%',
//     height: 50,
//   },
//   icon: {
//     position: 'absolute',
//     right: 10,
//     pointerEvents: 'none',
//     justifyContent:"center",
//     marginTop:15
//   },


//   pickerSelectStyles: {
//     inputIOS: {
//       fontSize: 16,
//       paddingVertical: 12,
//       color: '#000',
//     },
//     inputAndroid: {
//       fontSize: 16,
//       paddingVertical: 12,
//       color: '#000',
//     },
//     placeholder: {
//       color: '#888888',
//     },
//   }
// });

// export default AddEditRoomScreen;