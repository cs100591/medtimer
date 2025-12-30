class UserModel {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String language;
  final String timezone;
  final bool isVerified;
  final Map<String, dynamic>? preferences;
  final DateTime createdAt;
  final DateTime? updatedAt;

  UserModel({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.phone,
    this.language = 'en',
    this.timezone = 'UTC',
    this.isVerified = false,
    this.preferences,
    required this.createdAt,
    this.updatedAt,
  });

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? email;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      firstName: json['firstName'],
      lastName: json['lastName'],
      phone: json['phone'],
      language: json['language'] ?? 'en',
      timezone: json['timezone'] ?? 'UTC',
      isVerified: json['isVerified'] ?? false,
      preferences: json['preferences'],
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'language': language,
      'timezone': timezone,
      'isVerified': isVerified,
      'preferences': preferences,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? language,
    String? timezone,
    bool? isVerified,
    Map<String, dynamic>? preferences,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      language: language ?? this.language,
      timezone: timezone ?? this.timezone,
      isVerified: isVerified ?? this.isVerified,
      preferences: preferences ?? this.preferences,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
