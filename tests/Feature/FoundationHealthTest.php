<?php

namespace Tests\Feature;

use Tests\TestCase;

class FoundationHealthTest extends TestCase
{
    /**
     * Test the default root URL returns 200 OK.
     */
    public function test_root_endpoint_returns_ok(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    /**
     * Test Laravel health-check probe endpoint.
     */
    public function test_health_check_endpoint(): void
    {
        $response = $this->get('/up');
        $response->assertStatus(200);
    }

    /**
     * Test protected API route rejects unauthenticated guest requests.
     */
    public function test_unauthenticated_api_request_is_rejected(): void
    {
        $response = $this->getJson('/api/user');
        $response->assertStatus(401);
    }
}
