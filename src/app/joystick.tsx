import { Buffer } from 'buffer';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { clamp, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import dgram from 'react-native-udp';

const UDP_PORT = 4210;
const DEST_IP = '192.168.4.1';

export default function Joystick() {
  const socket = useRef(dgram.createSocket('udp4'));
  const offset = useSharedValue({ x: 0, y: 0 });
  const [debugData, setDebugData] = useState({ left: 0, right: 0, forward: 0 });

  useEffect(() => {
    try {
      socket.current.bind(0);
      console.log('Socket bound successfully');
    } catch (e) {
      console.warn('Socket already bound or error:', e);
    }

    return () => {
      if (socket.current) {
        socket.current.close();
        console.log('Socket closed');
      }
    };
  }, []);

  const sendUdp = (left: number, right: number, forward: number) => {
    setDebugData({ left, right, forward });
    const msg = JSON.stringify({ left, right, forward });
    const buffer = Buffer.from(msg);
    
    socket.current.send(buffer, 0, buffer.length, UDP_PORT, DEST_IP, (err) => {
      if (err) console.error('UDP Send Error:', err);
    });
  };

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      const clampedX = clamp(e.translationX, -70, 70);
      const clampedY = clamp(e.translationY, -70, 70);
      offset.value = { x: clampedX, y: clampedY };

      const left = clampedX < -33 ? 1 : 0;
      const right = clampedX > 33 ? 1 : 0;
      const forward = (clampedY < -33 && clampedX > -33 && clampedX < 33) ? 1 : 0;

      runOnJS(sendUdp)(left, right, forward);
    })
    .onEnd(() => {
      offset.value = { x: withSpring(0), y: withSpring(0) };
      runOnJS(sendUdp)(0, 0, 0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value.x }, { translateY: offset.value.y }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.joystickArea}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.knob, animatedStyle]} />
        </GestureDetector>
      </View>
      <View style={styles.debugBox}>
        <Text style={styles.debugText}>Forward: {debugData.forward}</Text>
        <Text style={styles.debugText}>Left: {debugData.left}</Text>
        <Text style={styles.debugText}>Right: {debugData.right}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 50 },
  joystickArea: {
    width: 200,
    height: 200,
    backgroundColor: '#ccc',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  knob: {
    width: 60,
    height: 60,
    backgroundColor: '#007AFF',
    borderRadius: 30,
  },
  debugBox: { marginTop: 20, alignItems: 'center' },
  debugText: { fontSize: 18, fontWeight: 'bold' }
});