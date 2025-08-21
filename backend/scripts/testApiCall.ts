import fetch from 'node-fetch';

const testApiCall = async () => {
  try {
    console.log('Testing API call to create project admin...');
    
    const payload = {
      name: 'Test API Admin',
      email: 'testapi@example.com',
      password: 'test123',
      currentUserRole: 'super_admin'
    };

    console.log('📝 Payload being sent:');
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch('http://localhost:3008/api/user/project-admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-role': 'super_admin'
      },
      body: JSON.stringify(payload)
    });

    console.log('\n📡 Response status:', response.status);
    
    const responseData = await response.json();
    console.log('📡 Response data:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ API call successful!');
      console.log('Name in response:', responseData.name);
      console.log('Email in response:', responseData.email);
      console.log('Role in response:', responseData.role);
    } else {
      console.log('\n❌ API call failed!');
    }
    
  } catch (error) {
    console.error('Error testing API call:', error);
  }
};

testApiCall(); 