<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'company',
        'notes',
        'status',
    ];

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'client_id');
    }

    public function enquiries(): HasMany
    {
        return $this->hasMany(ProjectEnquiry::class, 'client_id');
    }
}
