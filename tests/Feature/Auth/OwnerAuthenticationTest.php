<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class OwnerAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login:testowner|127.0.0.1');
        RateLimiter::clear('login:wronguser|127.0.0.1');
        RateLimiter::clear('login:test@studiodesire.com|127.0.0.1');
    }

    public function test_csrf_token_endpoint_returns_token_and_cookie(): void
    {
        $response = $this->getJson('/api/auth/csrf-token');

        $response->assertStatus(200)
            ->assertJsonStructure(['csrf_token'])
            ->assertCookie('csrf_token');
    }

    public function test_owner_can_login_with_valid_username(): void
    {
        $user = User::create([
            'name' => 'Studio Owner',
            'username' => 'testowner',
            'email' => 'owner@studiodesire.com',
            'password' => 'SecurePassword123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testowner',
            'password' => 'SecurePassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'user_id' => $user->id,
                'username' => 'testowner',
                'role' => 'OWNER',
            ])
            ->assertJsonStructure(['token', 'csrf_token']);

        $this->assertAuthenticatedAs($user);
    }

    public function test_owner_can_login_with_valid_email(): void
    {
        $user = User::create([
            'name' => 'Studio Owner',
            'username' => 'testowner',
            'email' => 'owner@studiodesire.com',
            'password' => 'SecurePassword123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'owner@studiodesire.com',
            'password' => 'SecurePassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'user_id' => $user->id,
                'email' => 'owner@studiodesire.com',
            ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_invalid_password(): void
    {
        User::create([
            'name' => 'Studio Owner',
            'username' => 'testowner',
            'email' => 'owner@studiodesire.com',
            'password' => 'CorrectPassword123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testowner',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(401)
            ->assertJsonStructure(['detail']);

        $this->assertGuest();
    }

    public function test_login_fails_for_inactive_account(): void
    {
        User::create([
            'name' => 'Inactive User',
            'username' => 'inactiveuser',
            'email' => 'inactive@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'OWNER',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'inactiveuser',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(401);
        $this->assertGuest();
    }

    public function test_login_is_throttled_after_five_failed_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'username' => 'wronguser',
                'password' => 'badpass',
            ])->assertStatus(401);
        }

        // 6th attempt should be rate limited with 429
        $response = $this->postJson('/api/auth/login', [
            'username' => 'wronguser',
            'password' => 'badpass',
        ]);

        $response->assertStatus(429)
            ->assertJsonStructure(['retry_after']);
    }

    public function test_owner_can_logout_and_session_is_invalidated(): void
    {
        $user = User::create([
            'name' => 'Studio Owner',
            'username' => 'testowner',
            'email' => 'owner@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'username' => 'testowner',
            'password' => 'Password123!',
        ]);

        $token = $loginResponse->json('token');

        $logoutResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson(['message' => 'Logged out successfully.']);

        // Subsequent check with the revoked token fails
        $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(401);
    }

    public function test_authenticated_owner_can_retrieve_profile_via_me(): void
    {
        $user = User::create([
            'name' => 'Studio Owner',
            'username' => 'testowner',
            'email' => 'owner@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'id' => $user->id,
                'username' => 'testowner',
                'role' => 'OWNER',
            ]);
    }

    public function test_owner_can_change_password_with_valid_current_password(): void
    {
        $user = User::create([
            'name' => 'Studio Owner',
            'username' => 'testowner',
            'email' => 'owner@studiodesire.com',
            'password' => 'OldPassword123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/auth/change-password', [
            'current_password' => 'OldPassword123!',
            'new_password' => 'NewStrongPassword456!',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password updated successfully.']);

        $user->refresh();
        $this->assertTrue(Hash::check('NewStrongPassword456!', $user->password));
    }
}
