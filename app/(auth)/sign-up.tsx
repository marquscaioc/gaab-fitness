import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  View,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
} from 'react-native';

import { useAuth } from '~/src/modules/auth/hooks/useAuth';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const image = require('../../assets/onboarding/logo.png');

  const onSignUpPress = async () => {
    if (!emailAddress || !password || !username) {
      setError('Please fill all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: signUpError } = await signUp(emailAddress, password, username);
      if (signUpError) {
        setError(signUpError.message);
      } else {
        router.replace('/(auth)/setup');
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.bodyContainer}>
          <Image
            source={image}
            style={{ width: 200, height: 200, borderRadius: 30, alignSelf: 'center', margin: 5 }}
          />
          <Text style={styles.title}>GAAB</Text>
          <Text style={styles.inputText}>Username</Text>
          <TextInput
            style={styles.textInput}
            autoCapitalize="none"
            value={username}
            placeholder="Your username"
            placeholderTextColor="gainsboro"
            onChangeText={setUsername}
          />
          <Text style={styles.inputText}>Email</Text>
          <TextInput
            style={styles.textInput}
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailAddress}
            placeholder="email@email.com"
            placeholderTextColor="gainsboro"
            onChangeText={setEmailAddress}
          />
          <Text style={styles.inputText}>Password</Text>
          <TextInput
            style={styles.textInput}
            value={password}
            placeholder="**********"
            placeholderTextColor="gainsboro"
            secureTextEntry
            onChangeText={setPassword}
          />
          {password.length > 0 && password.length < 8 && (
            <Text style={styles.warningMessage}>Password must be minimum of 8 characters!</Text>
          )}
          {error ? <Text style={styles.warningMessage}>{error}</Text> : null}
          <View style={styles.button}>
            <Pressable onPress={onSignUpPress} style={styles.buttonContainer} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>
          </View>
          <View style={styles.button}>
            <Text style={[styles.buttonText, { color: '#888' }]}>Already have an account?</Text>
            <Link asChild href="/(auth)/sign-in">
              <Pressable>
                <Text style={styles.buttonText}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
        <StatusBar style="light" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
  },
  bodyContainer: {
    width: '100%',
    padding: 10,
  },
  title: {
    color: 'green',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingBottom: 30,
  },
  textInput: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  warningMessage: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
    marginVertical: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 10,
    flexDirection: 'row',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    padding: 5,
    textAlign: 'center',
    fontSize: 14,
  },
  buttonContainer: {
    backgroundColor: '#6c47ff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});
