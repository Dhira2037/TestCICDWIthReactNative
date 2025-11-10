
import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, TextInput, SafeAreaView, FlatList } from 'react-native';
import { getDB } from '../utils/db';
import StyledButton from '../components/StyledButton';
import StyledNavButton from '../components/StyledNavButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const [summary, setSummary] = useState({ total: 0, occupied: 0, vacant: 0 });
  const [roomList, setRoomList] = useState([]);
  const [floorSummary, setFloorSummary] = useState([]);
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [allotName, setAllotName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [bedModalVisible, setBedModalVisible] = useState(false);
  const [bedList, setBedList] = useState([]);


  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <StyledNavButton title="Logout" onPress={handleLogout} />
      ),
      headerRight: () => (
        <StyledNavButton title="Rooms" onPress={() => navigation.navigate('RoomList')} />
      ),
    });
  }, [navigation]);

  const handleLogout = async () => {
    // Clear any stored user/session data if needed
    // AsyncStorage.removeItem('userToken'); // if used
    // Navigate to login screen
    await AsyncStorage.removeItem('isLoggedIn');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };


  useEffect(() => {
    loadRooms();
    loadFloorwiseSummary();
  }, []);

  useFocusEffect(
  useCallback(() => {
    loadRooms();
    loadFloorwiseSummary();
  }, [])
);

  const loadGroupedSummaries = () => {
    const db = getDB();

    db.transaction(tx => {
      // Floor-wise summary
      tx.executeSql(
        `SELECT floor, COUNT(*) AS rooms, SUM(occupiedBeds) AS occupied, SUM(totalBeds - occupiedBeds) AS vacant 
       FROM rooms GROUP BY floor`,
        [],
        (_, { rows }) => {
          const floors = [];
          for (let i = 0; i < rows.length; i++) {
            floors.push(rows.item(i));
          }
          setFloorStats(floors);
        }
      );

      // AC-type summary
      tx.executeSql(
        `SELECT acType, COUNT(*) AS rooms, SUM(occupiedBeds) AS occupied, SUM(totalBeds - occupiedBeds) AS vacant 
       FROM rooms GROUP BY acType`,
        [],
        (_, { rows }) => {
          const acTypes = [];
          for (let i = 0; i < rows.length; i++) {
            acTypes.push(rows.item(i));
          }
          setAcStats(acTypes);
        }
      );
    });
  };

  const loadFloorwiseSummary = () => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        `SELECT floor, acType, COUNT(*) AS rooms,
              SUM(occupiedBeds) AS occupied,
              SUM(totalBeds - occupiedBeds) AS vacant
       FROM rooms
       GROUP BY floor, acType
       ORDER BY floor ASC`,
        [],
        (_, { rows }) => {
          const summary = {};
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            if (!summary[row.floor]) {
              summary[row.floor] = [];
            }
            summary[row.floor].push(row);
          }
          setFloorSummary(summary);
        }
      );
    });
  };

  // const loadRooms = () => {
  //   const db = getDB();
  //   db.transaction(tx => {
  //     // First, get all rooms
  //     tx.executeSql(
  //       'SELECT * FROM rooms ORDER BY floor, roomNumber',
  //       [],
  //       (_, { rows }) => {
  //         const rooms = [];
  //         let totalBeds = 0;
  //         let occupied = 0;

  //         for (let i = 0; i < rows.length; i++) {
  //           const room = rows.item(i);
  //           room.allotments = []; // default empty list
  //           rooms.push(room);

  //           totalBeds += room.totalBeds;
  //           occupied += room.occupiedBeds;
  //         }
  //         console.log("------------" + JSON.stringify(rooms));

  //         // Now fetch allotments
  //         tx.executeSql(
  //           'SELECT * FROM room_allotments',
  //           [],
  //           (_, { rows }) => {
  //             const allotments = rows._array;

  //             // Group allotments by roomId
  //             rooms.forEach(room => {
  //               room.allotments = allotments
  //                 .filter(a => a.roomId === room.id)
  //                 .map(a => a.allotedTo);
  //             });
  //           }
  //         );

  //         setRoomList(rooms);
  //         setSummary({ total: rooms.length, occupied, vacant: totalBeds - occupied });
  //       }
  //     );
  //   });
  // };

  const loadRooms = () => {
    const db = getDB();

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM rooms ORDER BY floor, roomNumber',
        [],
        (_, { rows }) => {
          const rooms = [];
          let totalBeds = 0;
          let occupied = 0;

          for (let i = 0; i < rows.length; i++) {
            const room = rows.item(i);
            room.allotments = []; // Initialize empty
            rooms.push(room);

            totalBeds += room.totalBeds;
            occupied += room.occupiedBeds;
          }

          // ✅ Set rooms immediately so UI updates even if no allotments
          setRoomList(rooms);
          setSummary({ total: rooms.length, occupied, vacant: totalBeds - occupied });

          // 🔁 Now enrich with allotments (non-blocking enhancement)
          db.transaction(tx2 => {
            tx2.executeSql(
              'SELECT roomId, name FROM room_allotments',
              [],
              (_, { rows }) => {

                const allotments = [];
                for (let i = 0; i < rows.length; i++) {
                  const allot = rows.item(i);
                  allotments.push(allot);
                }


                const updatedRooms = rooms.map(room => ({
                  ...room,
                  allotments: allotments
                    .filter(a => a.roomId === room.id)
                    .map(a => a.name),
                }));

                // ✅ Update with enriched data (names)
                setRoomList(updatedRooms);
              },
              (error) => {
                console.log("Allotments fetch failed:", error);
              }
            );
          });
        },
        (error) => {
          console.error("Rooms fetch failed:", error);
        }
      );
    });
  };



  // const loadRooms = () => {
  //   const db = getDB();
  //   db.transaction(tx => {
  //     tx.executeSql('SELECT * FROM rooms ORDER BY floor, roomNumber', [], (_, { rows }) => {
  //       const data = [];
  //       for (let i = 0; i < rows.length; i++) {
  //         data.push(rows.item(i));
  //       }
  //       setRoomList(data);
  //       let totalBeds = 0, occupied = 0;
  //       data.forEach(r => {
  //         totalBeds += r.totalBeds;
  //         occupied += r.occupiedBeds;
  //       });
  //       setSummary({ total: data.length, occupied, vacant: totalBeds - occupied });
  //     });
  //   });
  // };

  // const handleAllotRoom = (roomId, currentOccupied) => {
  //   const db = getDB();
  //   db.transaction(tx => {
  //     tx.executeSql(
  //       'UPDATE rooms SET occupiedBeds = ? WHERE id = ?',
  //       [currentOccupied + 1, roomId],
  //       () => {
  //         loadRooms(); // refresh list and counts
  //         loadFloorwiseSummary();
  //       }
  //     );
  //   });
  // };


  const handleAllotRoom = (roomId, currentOccupied, totalBeds) => {

    if (currentOccupied >= totalBeds) {
      Alert.alert('Room Full', 'No more beds available.');
      return;
    }
    setSelectedRoom({ roomId, currentOccupied, totalBeds });
    setShowAllotModal(true);
  };


  const confirmAllotment = () => {
    const name = allotName.trim();
    if (!name) {
      Alert.alert('Invalid Name', 'Please enter a valid name.');
      return;
    }

    const { roomId } = selectedRoom;
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        `SELECT bedNumber FROM room_allotments WHERE roomId = ? ORDER BY bedNumber ASC`,
        [roomId],
        (_, { rows }) => {
          const takenBeds = new Set();
          for (let i = 0; i < rows.length; i++) {
            takenBeds.add(rows.item(i).bedNumber);
          }

          let nextBed = 1;
          while (takenBeds.has(nextBed)) nextBed++;

          tx.executeSql(
            `INSERT INTO room_allotments (roomId, name, bedNumber, createdAt) VALUES (?, ?, ?, ?)`,
            [roomId, name, nextBed, new Date().toISOString()]
          );

          tx.executeSql(
            'UPDATE rooms SET occupiedBeds = occupiedBeds + 1 WHERE id = ?',
            [roomId],
            () => {
              loadRooms();
              loadFloorwiseSummary();
              setShowAllotModal(false);
              setAllotName('');
            }
          );
        }
      );
    });
  };

  const renderRoomStatus = () => {
    const grouped = {};
    roomList.forEach(room => {
      if (!grouped[room.floor]) grouped[room.floor] = [];
      grouped[room.floor].push(room);
    });

    return Object.entries(grouped).map(([floor, rooms]) => (
      <View key={floor} style={styles.floorSection}>
        <Text style={styles.floorTitle}>Floor {floor}</Text>
        {rooms.map(room => {
          const isFull = room.occupiedBeds >= room.totalBeds;
          const isEmpty = room.occupiedBeds <= 0;

          return (
            <View key={room.id} style={[styles.roomRow, isFull && styles.fullRoom]}>
              <View style={styles.roomInfo}>
                <Text style={styles.roomText}>
                  Room {room.roomNumber} ({room.acType})
                </Text>
                <Text style={styles.roomText}>
                  {room.occupiedBeds}/{room.totalBeds} Beds
                </Text>

                {/* 🧑 Show Allotted To Names
                {room.allotments && room.allotments.length > 0 ? (
                  room.allotments.map((name, index) => (
                    <Text key={index} style={styles.allotName}>• {name}</Text>
                  ))
                ) : (
                  <Text style={styles.allotNone}>No one allotted yet</Text>
                )} */}
              </View>

              {/* 🔄 Revert or Allot Buttons */}
              {!isEmpty && (
                <TouchableOpacity
                  style={styles.revertButton}
                  onPress={() => handleRevertRoom(room.id, room.occupiedBeds)}
                >
                  <Text style={styles.revertText}>REVERT</Text>
                </TouchableOpacity>
              )}
              {isFull ? (
                <Text style={styles.fullLabel}>FULL</Text>
              ) : (
                <TouchableOpacity
                  style={styles.allotButton}
                  onPress={() => handleAllotRoom(room.id, room.occupiedBeds, room.totalBeds)}
                >
                  <Text style={styles.allotText}>ALLOT</Text>
                </TouchableOpacity>
              )}
              {room.allotments && room.allotments.length > 0 && (
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => openBedModal(room)}
                >
                  <Text style={styles.viewText}>VIEW</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    ));
  };


  const openBedModal = (room) => {
    setSelectedRoom(room);
    loadBedsForRoom(room.id, room.totalBeds);
    setBedModalVisible(true);
  };

  const loadBedsForRoom = (roomId, totalBeds) => {

    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT bedNumber, name, id FROM room_allotments WHERE roomId = ? ORDER BY bedNumber',
        [roomId],
        (_, { rows }) => {
          //const occupiedBeds = rows._array;


          const occupiedBeds = [];
          for (let i = 0; i < rows.length; i++) {
            occupiedBeds.push(rows.item(i));
          }

          const allBeds = [];
          for (let i = 1; i <= totalBeds; i++) {
            const occupied = occupiedBeds.find(b => b.bedNumber === i);
            allBeds.push({
              bedNumber: i,
              name: occupied?.name || null,
              id: occupied?.id || null,
            });
          }
          setBedList(allBeds);
        }
      );
    });
  };

  const handleDeleteBed = (bedId) => {
    Alert.alert('Remove Bed', 'Are you sure you want to remove this allotment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const db = getDB();
          db.transaction(tx => {
            tx.executeSql(
              'DELETE FROM room_allotments WHERE id = ?',
              [bedId],
              () => {
                // Decrease occupied count
                tx.executeSql(
                  'UPDATE rooms SET occupiedBeds = occupiedBeds - 1 WHERE id = ?',
                  [selectedRoom.id],
                  () => {
                    loadRooms();
                    loadFloorwiseSummary();
                    loadBedsForRoom(selectedRoom.id, selectedRoom.totalBeds);
                  }
                );
              }
            );
          });
        }
      }
    ]);
  };



  // const renderRoomStatus = () => {
  //   const grouped = {};
  //   roomList.forEach(room => {
  //     if (!grouped[room.floor]) grouped[room.floor] = [];
  //     grouped[room.floor].push(room);
  //   });

  //   return Object.entries(grouped).map(([floor, rooms]) => (
  //     <View key={floor} style={styles.floorSection}>
  //       <Text style={styles.floorTitle}>Floor {floor}</Text>
  //       {rooms.map(room => {
  //         const isFull = room.occupiedBeds >= room.totalBeds;
  //         const isEmpty = room.occupiedBeds <= 0;

  //         return (
  //           <View key={room.id} style={[styles.roomRow, isFull && styles.fullRoom]}>
  //             <View style={styles.roomInfo}>
  //               <Text style={styles.roomText}>
  //                 Room {room.roomNumber} ({room.acType})
  //               </Text>
  //               <Text style={styles.roomText}>
  //                 {room.occupiedBeds}/{room.totalBeds} Beds
  //               </Text>
  //             </View>
  //             {!isEmpty && (
  //               <TouchableOpacity
  //                 style={styles.revertButton}
  //                 onPress={() => handleRevertRoom(room.id, room.occupiedBeds)}
  //               >
  //                 <Text style={styles.revertText}>REVERT</Text>
  //               </TouchableOpacity>
  //             )}
  //             {isFull ? (
  //               <Text style={styles.fullLabel}>FULL</Text>
  //             ) : (
  //               <TouchableOpacity
  //                 style={styles.allotButton}
  //                 onPress={() => handleAllotRoom(room.id, room.occupiedBeds)}
  //               >
  //                 <Text style={styles.allotText}>ALLOT</Text>
  //               </TouchableOpacity>
  //             )}


  //           </View>
  //         );
  //       })}
  //     </View>
  //   ));
  // };

  // const handleRevertRoom = (roomId, currentOccupied) => {
  //   if (currentOccupied <= 0) return;

  //   const db = getDB();
  //   db.transaction(tx => {
  //     tx.executeSql(
  //       'UPDATE rooms SET occupiedBeds = ? WHERE id = ?',
  //       [currentOccupied - 1, roomId],
  //       () => {
  //         loadRooms(); // refresh list and summary
  //         loadFloorwiseSummary();
  //       }
  //     );
  //   });
  // };


  const handleRevertRoom = (roomId, currentOccupied) => {
    if (currentOccupied <= 0) return;

    Alert.alert(
      'Confirm Revert',
      'Are you sure you want to revert the last allotment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: () => {
            const db = getDB();
            db.transaction(tx => {
              // Step 1: Remove the most recent allotment for this room
              tx.executeSql(
                `DELETE FROM room_allotments 
               WHERE id = (
                 SELECT id FROM room_allotments 
                 WHERE roomId = ? 
                 ORDER BY createdAt DESC LIMIT 1
               )`,
                [roomId]
              );

              // Step 2: Decrease the occupiedBeds count
              tx.executeSql(
                'UPDATE rooms SET occupiedBeds = occupiedBeds - 1 WHERE id = ?',
                [roomId],
                () => {
                  loadRooms();            // refresh list and summary
                  loadFloorwiseSummary(); // optional if you're showing summaries
                }
              );
            });
          }
        }
      ]
    );
  };


  // const generateAndShareRoomPDF = async () => {
  //   const db = getDB();

  //   db.transaction(tx => {
  //     tx.executeSql(
  //       'SELECT * FROM rooms ORDER BY floor, roomNumber',
  //       [],
  //       async (_, { rows }) => {

  //         const roomList = [];
  //         for (let i = 0; i < rows.length; i++) {
  //           roomList.push(rows.item(i));
  //         }
  //         if (!roomList.length) {
  //           Alert.alert('No data to generate report');
  //           return;
  //         }

  //         // Group by floor
  //         const grouped = {};
  //         roomList.forEach(room => {
  //           if (!grouped[room.floor]) grouped[room.floor] = [];
  //           grouped[room.floor].push(room);
  //         });

  //         // Create HTML content
  //         let floorSections = '';
  //         Object.entries(grouped).forEach(([floor, rooms]) => {
  //           let rows = '';
  //           rooms.forEach(room => {
  //             const isFull = room.occupiedBeds >= room.totalBeds;
  //             const status = isFull
  //               ? `<span class="status-full">FULL</span>`
  //               : `<span class="status-available">AVAILABLE</span>`;

  //             rows += `
  //             <tr>
  //               <td>Room ${room.roomNumber}</td>
  //               <td>${room.acType}</td>
  //               <td>${room.occupiedBeds}</td>
  //               <td>${room.totalBeds}</td>
  //               <td>${status}</td>
  //             </tr>
  //           `;
  //           });

  //           floorSections += `
  //           <div>
  //             <div class="floor-title">Floor ${floor}</div>
  //             <table>
  //               <thead>
  //                 <tr>
  //                   <th>Room</th>
  //                   <th>AC Type</th>
  //                   <th>Occupied Beds</th>
  //                   <th>Remaining Beds</th>
  //                   <th>Status</th>
  //                 </tr>
  //               </thead>
  //               <tbody>${rows}</tbody>
  //             </table>
  //           </div>
  //         `;
  //         });

  //         const html = `
  //       <html>
  //       <head>
  //         <style>
  //           body {
  //             font-family: Arial;
  //             padding: 16px;
  //             color: #333;
  //           }
  //           h1 {
  //             text-align: center;
  //             color: #2c3e50;
  //           }
  //           .floor-title {
  //             margin-top: 30px;
  //             font-size: 18px;
  //             font-weight: bold;
  //             color: #007bff;
  //           }
  //           table {
  //             width: 100%;
  //             border-collapse: collapse;
  //             margin-top: 8px;
  //           }
  //           th, td {
  //             border: 1px solid #ccc;
  //             padding: 8px;
  //             text-align: left;
  //           }
  //           th {
  //             background-color: #f2f2f2;
  //           }
  //           .status-full {
  //             background-color: #dc3545;
  //             color: white;
  //             padding: 2px 6px;
  //             border-radius: 4px;
  //             font-weight: bold;
  //           }
  //           .status-available {
  //             background-color: #28a745;
  //             color: white;
  //             padding: 2px 6px;
  //             border-radius: 4px;
  //             font-weight: bold;
  //           }
  //         </style>
  //       </head>
  //       <body>
  //         <h1>Room Status Report</h1>
  //         <p>Generated on ${new Date().toLocaleString()}</p>
  //         ${floorSections}
  //       </body>
  //       </html>
  //       `;

  //         // Generate PDF
  //         const options = {
  //           html,
  //           fileName: `Room_Report_${Date.now()}`,
  //           directory: 'Documents',
  //         };

  //         const file = await RNHTMLtoPDF.convert(options);

  //         // Share PDF
  //         await Share.open({
  //           url: `file://${file.filePath}`,
  //           title: 'Share Room Report',
  //         });
  //       },
  //       error => {
  //         console.error('Failed to fetch room data:', error);
  //         Alert.alert('Error', 'Failed to generate report.');
  //       }
  //     );
  //   });
  // };

  // const generateAndShareRoomPDF = async () => {
  //   const db = getDB();

  //   db.transaction(tx => {
  //     // Step 1: Get all rooms
  //     tx.executeSql('SELECT * FROM rooms ORDER BY floor, roomNumber', [], (_, { rows }) => {
  //       const roomList = [];
  //       for (let i = 0; i < rows.length; i++) {
  //         roomList.push(rows.item(i));
  //       }

  //       if (!roomList.length) {
  //         Alert.alert('No data to generate report');
  //         return;
  //       }

  //       // Step 2: Get all allotments
  //       tx.executeSql('SELECT roomId, bedNumber, name FROM room_allotments ORDER BY roomId, bedNumber', [], async (_, { rows }) => {
  //         const allotmentMap = {};

  //         for (let i = 0; i < rows.length; i++) {
  //           const a = rows.item(i);
  //           if (!allotmentMap[a.roomId]) allotmentMap[a.roomId] = [];
  //           allotmentMap[a.roomId].push(`Bed ${a.bedNumber}: ${a.name}`);
  //         }

  //         // Step 3: Group by floor
  //         const grouped = {};
  //         roomList.forEach(room => {
  //           if (!grouped[room.floor]) grouped[room.floor] = [];
  //           room.allotments = allotmentMap[room.id] || [];
  //           grouped[room.floor].push(room);
  //         });

  //         // Step 4: Create HTML content
  //         let floorSections = '';
  //         Object.entries(grouped).forEach(([floor, rooms]) => {
  //           let rows = '';
  //           rooms.forEach(room => {
  //             const isFull = room.occupiedBeds >= room.totalBeds;
  //             const status = isFull
  //               ? `<span class="status-full">FULL</span>`
  //               : `<span class="status-available">AVAILABLE</span>`;

  //             const allotList = room.allotments.length
  //               ? `<ul>${room.allotments.map(a => `<li>${a}</li>`).join('')}</ul>`
  //               : '<em>None</em>';

  //             rows += `
  //             <tr>
  //               <td>Room ${room.roomNumber}</td>
  //               <td>${room.acType}</td>
  //               <td>${room.occupiedBeds}</td>
  //               <td>${room.totalBeds}</td>
  //               <td>${status}</td>
  //               <td>${allotList}</td>
  //             </tr>
  //           `;
  //           });

  //           floorSections += `
  //           <div>
  //             <div class="floor-title">Floor ${floor}</div>
  //             <table>
  //               <thead>
  //                 <tr>
  //                   <th>Room</th>
  //                   <th>AC Type</th>
  //                   <th>Occupied Beds</th>
  //                   <th>Total Beds</th>
  //                   <th>Status</th>
  //                   <th>Allotted To</th>
  //                 </tr>
  //               </thead>
  //               <tbody>${rows}</tbody>
  //             </table>
  //           </div>
  //         `;
  //         });

  //         const html = `
  //         <html>
  //         <head>
  //           <style>
  //             body {
  //               font-family: Arial;
  //               padding: 16px;
  //               color: #333;
  //             }
  //             h1 {
  //               text-align: center;
  //               color: #2c3e50;
  //             }
  //             .floor-title {
  //               margin-top: 30px;
  //               font-size: 18px;
  //               font-weight: bold;
  //               color: #007bff;
  //             }
  //             table {
  //               width: 100%;
  //               border-collapse: collapse;
  //               margin-top: 8px;
  //             }
  //             th, td {
  //               border: 1px solid #ccc;
  //               padding: 8px;
  //               text-align: left;
  //               vertical-align: top;
  //             }
  //             th {
  //               background-color: #f2f2f2;
  //             }
  //             .status-full {
  //               background-color: #dc3545;
  //               color: white;
  //               padding: 2px 6px;
  //               border-radius: 4px;
  //               font-weight: bold;
  //             }
  //             .status-available {
  //               background-color: #28a745;
  //               color: white;
  //               padding: 2px 6px;
  //               border-radius: 4px;
  //               font-weight: bold;
  //             }
  //             ul {
  //               margin: 0;
  //               padding-left: 18px;
  //             }
  //             li {
  //               margin: 2px 0;
  //             }
  //           </style>
  //         </head>
  //         <body>
  //           <h1>Room Status Report</h1>
  //           <p>Generated on ${new Date().toLocaleString()}</p>
  //           ${floorSections}
  //         </body>
  //         </html>
  //       `;

  //         // Step 5: Generate PDF
  //         const options = {
  //           html,
  //           fileName: `Room_Report_${Date.now()}`,
  //           directory: 'Documents',
  //         };

  //         const file = await RNHTMLtoPDF.convert(options);

  //         // Step 6: Share PDF
  //         await Share.open({
  //           url: `file://${file.filePath}`,
  //           title: 'Share Room Report',
  //         });
  //       });
  //     },
  //       error => {
  //         console.error('Failed to fetch room data:', error);
  //         Alert.alert('Error', 'Failed to generate report.');
  //       });
  //   });
  // };


  const generateAndShareRoomPDF = async () => {
  const db = getDB();

  db.transaction(tx => {
    tx.executeSql('SELECT * FROM rooms ORDER BY floor, roomNumber', [], (_, { rows }) => {
      const roomList = [];
      for (let i = 0; i < rows.length; i++) {
        roomList.push(rows.item(i));
      }

      if (!roomList.length) {
        Alert.alert('No data to generate report');
        return;
      }

      tx.executeSql('SELECT roomId, bedNumber, name FROM room_allotments ORDER BY roomId, bedNumber', [], async (_, { rows }) => {
        const allotmentMap = {};

        for (let i = 0; i < rows.length; i++) {
          const a = rows.item(i);
          if (!allotmentMap[a.roomId]) allotmentMap[a.roomId] = [];
          allotmentMap[a.roomId].push(`Bed ${a.bedNumber}: ${a.name}`);
        }

        const grouped = {};
        roomList.forEach(room => {
          if (!grouped[room.floor]) grouped[room.floor] = [];
          room.allotments = allotmentMap[room.id] || [];
          grouped[room.floor].push(room);
        });

        let floorSections = '';
        Object.entries(grouped).forEach(([floor, rooms]) => {
          let rows = '';
          rooms.forEach(room => {
            const isFull = room.occupiedBeds >= room.totalBeds;
            const status = isFull
              ? `<span class="status-full">FULL</span>`
              : `<span class="status-available">AVAILABLE</span>`;
            const vacant = room.totalBeds - room.occupiedBeds;

            const allotList = room.allotments.length
              ? `<ul>${room.allotments.map(a => `<li>${a}</li>`).join('')}</ul>`
              : '<em>None</em>';

            rows += `
              <tr>
                <td>Room ${room.roomNumber}</td>
                <td>${room.acType}</td>
                <td>${room.totalBeds}</td>
                <td>${room.occupiedBeds}</td>
                <td>${vacant}</td>
                <td>${status}</td>
                <td>${allotList}</td>
              </tr>
            `;
          });

          floorSections += `
            <div>
              <div class="floor-title">Floor ${floor}</div>
              <table>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>AC Type</th>
                     <th>Total Beds</th>
                    <th>Occupied Beds</th>
                    <th>Vacant Beds</th>
                    <th>Status</th>
                    <th>Allotted To</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        });

        const html = `
          <html>
          <head>
            <style>
              body {
                font-family: Arial;
                padding: 16px;
                color: #333;
              }
              h1 {
                text-align: center;
                color: #2c3e50;
              }
              .floor-title {
                margin-top: 30px;
                font-size: 18px;
                font-weight: bold;
                color: #007bff;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
                vertical-align: top;
              }
              th {
                background-color: #f2f2f2;
              }
              .status-full {
                background-color: #dc3545;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: bold;
              }
              .status-available {
                background-color: #28a745;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: bold;
              }
              ul {
                margin: 0;
                padding-left: 18px;
              }
              li {
                margin: 2px 0;
              }
            </style>
          </head>
          <body>
            <h1>Room Status Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            ${floorSections}
          </body>
          </html>
        `;

        const options = {
          html,
          fileName: `Room_Report_${Date.now()}`,
          directory: 'Documents',
        };

        const file = await RNHTMLtoPDF.convert(options);

        await Share.open({
          url: `file://${file.filePath}`,
          title: 'Share Room Report',
        });
      });
    },
    error => {
      console.error('Failed to fetch room data:', error);
      Alert.alert('Error', 'Failed to generate report.');
    });
  });
};



  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(floorSummary).map(([floor, acGroups]) => (
              <View key={floor} style={styles.floorGroup}>
                <View style={styles.statBox}>
                  <Text style={styles.floorHeader}>Floor {floor}</Text>
                  <View style={styles.divider} />
                  {acGroups.map((item, index) => {
                    const isAC = item.acType === 'AC';
                    const bgColor = isAC ? '#e3f2fd' : '#e8f5e9';         // light blue / green backgrounds
                    const textColor = isAC ? '#0d47a1' : '#1b5e20';        // deep blue / green text
                    return (
                      <View key={index} style={[styles.row, { backgroundColor: bgColor, borderRadius: 8, padding: 8, marginVertical: 4 }]}>
                        <Text style={[styles.acLabel, { color: textColor }]}>{item.acType}:</Text>
                        <Text style={[styles.statText, styles.roomCount]}>Rooms: {item.rooms}</Text>
                        <Text style={[styles.statText, styles.occupied]}>Occupied Beds: {item.occupied}</Text>
                        <Text style={[styles.statText, styles.vacant]}>Vacant Beds: {item.vacant}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.roomListCard}>
          <Text style={styles.sectionTitle}>Room Status</Text>
          {renderRoomStatus()}
        </View>
      </ScrollView>
      <TouchableOpacity onPress={generateAndShareRoomPDF} style={{
        backgroundColor: '#4CAF50',
        padding: 14,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
        marginHorizontal: 20
      }}>
        <Text style={{
          color: '#fff',
          fontWeight: 'bold',
        }}>Export PDF</Text>
      </TouchableOpacity>


      {showAllotModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAllotModal(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.modalBox}>
              <Text style={modalStyles.title}>Allot Room</Text>
              <TextInput
                placeholderTextColor="#888888"
                placeholder="Enter name"
                value={allotName}
                onChangeText={setAllotName}
                style={modalStyles.input}
              />
              <View style={modalStyles.buttons}>

                <StyledButton title="CANCEL" onPress={() => setShowAllotModal(false)} />
                <StyledButton title="ALLOT" onPress={confirmAllotment} />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* //To show bed details */}
      <Modal
        visible={bedModalVisible}
        animationType="slide"
        onRequestClose={() => setBedModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#ddd', backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#333' }}>
              Bed Details - Room {selectedRoom?.roomNumber}
            </Text>
          </View>

          <FlatList
            data={bedList}
            keyExtractor={(item) => item.bedNumber.toString()}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const isVacant = !item.name;
              return (
                <View
                  style={{
                    marginBottom: 12,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: isVacant ? '#e8f5e9' : '#fff3e0',
                    borderWidth: 1,
                    borderColor: isVacant ? '#66bb6a' : '#ffa726',
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,

                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
                    Bed #{item.bedNumber}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 14, color: '#555' }}>
                    Allotted To:{' '}
                    <Text style={{ fontWeight: 'bold', color: isVacant ? '#388e3c' : '#ef6c00' }}>
                      {item.name || 'Vacant'}
                    </Text>
                  </Text>

                  {!isVacant && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleDeleteBed(item.id)}
                    >
                      <Text style={[styles.viewText, { textAlign: 'center' }]}>REMOVE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
          <View style={{ marginRight: 20, marginLeft: 20 }}><StyledButton title="CLOSE" onPress={() => setBedModalVisible(false)} /></View>
        </SafeAreaView>
      </Modal>


    </View>
  );
};


const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',

  },
  cancel: {
    marginRight: 10
  },
  cancelText: {
    color: '#dc3545',
    fontWeight: '600'
  },
  confirm: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600'
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    marginBottom: 20
  },
  card: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 5,
  },
  roomListCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  value: {
    fontWeight: 'bold',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  floorSection: {
    marginBottom: 15,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },


  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  fullRoom: {
    backgroundColor: '#ffdddd',
    borderColor: '#ff5c5c',
  },

  roomText: {
    fontSize: 14,
    color: '#333',
  },

  roomInfo: {
    flex: 1,
  },

  fullLabel: {
    fontWeight: 'bold',
    color: '#b00020',
    backgroundColor: '#ffd6d6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },

  allotButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  allotText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  revertButton: {
    backgroundColor: '#ffc107', // yellow
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },

  revertText: {
    color: '#000',
    fontWeight: 'bold',
  },


  scrollRow: {
    flexDirection: 'row',
    paddingVertical: 8,

  },



  summaryHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
    color: '#333',
  },


  floorGroup: {
    marginRight: 10,
  },
  statBox: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 12,
    elevation: 3,
  },
  floorHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 4,
  },
  acLabel: {
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 15,
  },
  statText: {
    marginRight: 12,
    fontSize: 14,
    color: '#444',
  },
  occupied: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 12,
  },
  vacant: {
    color: '#388e3c', // green
    fontWeight: 'bold',
    fontSize: 15,
  },
  roomCount: {
    color: '#6c757d', // Neutral gray
    fontWeight: 'bold',
    fontSize: 15,
  },
  allotName: {
    fontSize: 13,
    color: '#007bff',
    marginTop: 2,
  },
  allotNone: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  viewButton: {

    backgroundColor: '#6f42c1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 5

  },
  removeButton: {

    backgroundColor: 'red',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 0,
    marginTop: 5
  },
  viewText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
