<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'must_change_password',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Find user for authentication using case-insensitive username or email match.
     */
    public static function findForAuth(string $identifier): ?self
    {
        $normalized = strtolower(trim($identifier));

        return static::where(function ($query) use ($normalized) {
            $query->whereRaw('LOWER(username) = ?', [$normalized])
                  ->orWhereRaw('LOWER(email) = ?', [$normalized]);
        })->first();
    }

    /**
     * Check if user is the primary Studio Desire Owner or Master admin.
     */
    public function isOwner(): bool
    {
        $normalized = strtoupper((string) $this->role);
        return in_array($normalized, ['OWNER', 'MASTER', 'ADMIN'], true);
    }

    /**
     * Check if user has one of the allowed roles.
     *
     * @param array<string>|string $roles
     */
    public function hasRole(array|string $roles): bool
    {
        $allowed = is_array($roles) ? array_map('strtoupper', $roles) : [strtoupper($roles)];
        $userRole = strtoupper((string) $this->role);

        if (in_array($userRole, ['OWNER', 'MASTER'], true)) {
            return true;
        }

        return in_array($userRole, $allowed, true);
    }
}
